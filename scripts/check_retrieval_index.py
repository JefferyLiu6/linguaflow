"""Run retrieval checks against a disposable localhost-only pgvector container.

Use the agent virtual environment's Python. Docker must already be running.
Never reads application DATABASE_URL; cleans up only the container it creates.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
import hashlib
import xml.etree.ElementTree as ET
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def command(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, timeout=kwargs.pop('timeout', 30), **kwargs).stdout.strip()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', default='pgvector/pgvector:pg16')
    parser.add_argument('--all', action='store_true', help='Run the entire Python suite with real integration enabled')
    parser.add_argument('--output', type=Path, default=ROOT / 'agent/runs/index-integration.xml')
    args = parser.parse_args(argv)
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    name = 'linguaflow-retrieval-test-' + uuid.uuid4().hex[:12]
    report = {'started_at_utc': datetime.now(timezone.utc).isoformat(), 'image_requested': args.image, 'status': 'invalid', 'scope': 'synthetic-vector PostgreSQL integration; no external embedding calls'}
    try:
        report['docker_version'] = command('docker', 'version', '--format', '{{.Server.Version}}')
        print('Starting disposable pgvector database...', flush=True)
        command('docker', 'run', '--detach', '--rm', '--name', name, '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD=integration-only', '--env', 'POSTGRES_DB=retrieval_test', args.image, timeout=300)
        report['image_id'] = command('docker', 'inspect', '--format', '{{.Image}}', name)
        report['image_digests'] = json.loads(command('docker', 'image', 'inspect', '--format', '{{json .RepoDigests}}', report['image_id']))
        deadline = time.monotonic() + 60
        while True:
            ready = subprocess.run(['docker', 'exec', name, 'pg_isready', '-U', 'postgres', '-d', 'retrieval_test'], capture_output=True, timeout=10)
            if ready.returncode == 0:
                break
            if time.monotonic() >= deadline:
                raise RuntimeError('Temporary PostgreSQL did not become ready within 60 seconds')
            time.sleep(0.5)
        report['postgres_version'] = command('docker', 'exec', name, 'psql', '-U', 'postgres', '-d', 'retrieval_test', '-Atc', 'SHOW server_version')
        report['pgvector_version'] = command('docker', 'exec', name, 'psql', '-U', 'postgres', '-d', 'retrieval_test', '-Atc', "SELECT default_version FROM pg_available_extensions WHERE name='vector'")
        binding = command('docker', 'port', name, '5432/tcp')
        if not binding.startswith('127.0.0.1:') or '\n' in binding:
            raise RuntimeError('Unexpected container binding')
        port = int(binding.rsplit(':', 1)[1])
        env = dict(os.environ)
        env['RETRIEVAL_TEST_DATABASE_URL'] = f'postgresql://postgres:integration-only@127.0.0.1:{port}/retrieval_test'
        # Do not expose application/provider configuration to this test run.
        for key in ('DATABASE_URL', 'DIRECT_URL', 'OPENAI_API_KEY'):
            env.pop(key, None)
        target = 'tests/' if args.all else 'tests/test_index_integration.py'
        print('Running real database checks...', flush=True)
        result = subprocess.run([sys.executable, '-m', 'pytest', target, '-q', '--tb=short', '-p', 'no:cacheprovider', '--junitxml=' + str(output)], cwd=ROOT / 'agent', env=env, timeout=180)
        report['pytest_exit_code'] = result.returncode
        if output.exists():
            suites = ET.parse(output).getroot().iter('testsuite')
            report['tests'] = {key: 0 for key in ('tests', 'failures', 'errors', 'skipped')}
            for suite in suites:
                for key in report['tests']:
                    report['tests'][key] += int(suite.get(key, 0))
        sources = list((ROOT / 'agent/retrieval').glob('*.py')) + [ROOT / 'agent/tests/test_index_integration.py']
        sources += list((ROOT / 'prisma/migrations').glob('*retrieval*/migration.sql'))
        report['source_sha256'] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(sources)}
        report['status'] = 'passed' if result.returncode == 0 else 'failed'
        return result.returncode
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        report['error'] = str(exc)
        print('Integration setup/run failed: ' + str(exc), file=sys.stderr)
        return 1
    finally:
        try:
            cleanup = subprocess.run(['docker', 'rm', '--force', name], capture_output=True, timeout=30)
            report['container_removed'] = cleanup.returncode == 0
        except (OSError, subprocess.SubprocessError):
            report['container_removed'] = False
        output.with_suffix('.json').write_text(json.dumps(report, indent=2) + '\n')
        print('Integration evidence: ' + str(output.with_suffix('.json')), flush=True)


if __name__ == '__main__':
    raise SystemExit(main())
