"""Run paid evaluation against a disposable localhost-only index, never production.

The API key must be in the process environment. Never loads application database
configuration. Removes only its own container after preserving result artifacts.
"""
import argparse
import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'agent'))


def command(*args):
    return subprocess.run(args, check=True, text=True, capture_output=True, timeout=60).stdout.strip()


def main(argv=None):
    from evals.expansion.runner import checked, index_preflight, execute, distinct_paths
    from evals.expansion.budget import Budget, guarded_clients
    from evals.rag.runner import write_new
    from retrieval.sync_embeddings import sync_language
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--records', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--allow-paid', action='store_true')
    args = parser.parse_args(argv)
    distinct_paths([args.plan, args.records, args.output])
    plan = checked(json.loads(args.plan.read_text()))
    if not args.allow_paid:
        raise ValueError('Explicit --allow-paid is required')
    if args.records.exists() or args.output.exists():
        raise ValueError('Preserve existing records/results; choose a new run version')
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError('OPENAI_API_KEY must be configured; no database configuration is loaded')
    # Resolve the tokenizer before spending on index embeddings.
    import tiktoken
    tiktoken.get_encoding('cl100k_base')
    name = 'linguaflow-evaluation-' + uuid.uuid4().hex[:12]
    previous_url = os.environ.get('DATABASE_URL')
    receipt = {'environment': 'disposable_local_pgvector', 'production_database_used': False}
    index_budget = Budget(plan['prices_usd_per_million'], .01, 10)
    collection_budget = Budget(plan['prices_usd_per_million'], plan['budget']['max_usd'], plan['budget']['max_provider_requests'])
    try:
        command('docker', 'run', '--detach', '--rm', '--name', name, '--publish', '127.0.0.1::5432',
                '--env', 'POSTGRES_PASSWORD=eval-only', '--env', 'POSTGRES_DB=evaluation', 'pgvector/pgvector:pg16')
        receipt['image_id'] = command('docker', 'inspect', '--format', '{{.Image}}', name)
        deadline = time.monotonic() + 60
        while True:
            ready = subprocess.run(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'evaluation'], capture_output=True, timeout=5)
            if ready.returncode == 0:
                break
            if time.monotonic() > deadline:
                raise RuntimeError('Disposable database did not become ready')
            time.sleep(.5)
        binding = command('docker', 'port', name, '5432/tcp')
        if not binding.startswith('127.0.0.1:') or '\n' in binding:
            raise RuntimeError('Unexpected database binding')
        port = int(binding.rsplit(':', 1)[1])
        os.environ['DATABASE_URL'] = f'postgresql://postgres:eval-only@127.0.0.1:{port}/evaluation'
        import psycopg2
        with psycopg2.connect(os.environ['DATABASE_URL'], connect_timeout=5) as connection:
            with connection.cursor() as cursor:
                for migration in ('20260425000001_add_retrieval_docs', '20260915000001_retrieval_publication_manifest'):
                    cursor.execute((ROOT / 'prisma/migrations' / migration / 'migration.sql').read_text())
        print('Embedding 200 notes into the disposable evaluation index...', flush=True)
        with guarded_clients(index_budget):
            stats = sync_language('en')
        receipt['index_embedding_budget'] = index_budget.receipt()
        if stats.failed or index_budget.stopped:
            raise RuntimeError('Evaluation index publication failed')
        receipt['index_at_start'] = index_preflight(plan)
        print('Starting paired 100-question collection...', flush=True)
        result = asyncio.run(execute(plan, args.records, budget=collection_budget))
        receipt.update(result)
    except Exception as exc:
        receipt.update(status='failed_local_evaluation', error_type=type(exc).__name__,
                       index_embedding_budget=index_budget.receipt(), budget=collection_budget.receipt(),
                       release_authorized=False)
        # Do not serialize exception strings that could include credentials.
        print('Evaluation stopped:', type(exc).__name__, flush=True)
    finally:
        try:
            removed = subprocess.run(['docker', 'rm', '--force', name], capture_output=True, timeout=30)
            receipt['container_removed'] = removed.returncode == 0
        except (OSError, subprocess.SubprocessError):
            receipt['container_removed'] = False
        if previous_url is None:
            os.environ.pop('DATABASE_URL', None)
        else:
            os.environ['DATABASE_URL'] = previous_url
        write_new(args.output, receipt)
        print('Saved evaluation report:', args.output, flush=True)
    return 0 if receipt.get('status') == 'completed_synthetic_comparison' else 2


if __name__ == '__main__':
    raise SystemExit(main())
