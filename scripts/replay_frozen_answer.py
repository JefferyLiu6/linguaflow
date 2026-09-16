"""Replay the historical answer pilot using its original Git source snapshot."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
REVISION='805c50e'  # Frozen plan v3 code, before any answer generation.


def main():
    output=Path(sys.argv[1]).resolve()
    with tempfile.TemporaryDirectory(prefix='linguaflow-frozen-') as directory:
        # git archive contains only committed project files, never ignored secrets.
        archive=subprocess.run(['git','archive',REVISION],cwd=ROOT,check=True,stdout=subprocess.PIPE).stdout
        subprocess.run(['tar','-xf','-','-C',directory],input=archive,check=True)
        env={k:v for k,v in os.environ.items() if k not in ('OPENAI_API_KEY','DATABASE_URL','LANGFUSE_PUBLIC_KEY','LANGFUSE_SECRET_KEY')}
        env['PYTHONPATH']=str(Path(directory)/'agent')
        subprocess.run([sys.executable,'-m','evals.rag.runner','replay',
            '--plan',str(ROOT/'agent/runs/answer-pilot-v3-plan.json'),
            '--records',str(ROOT/'agent/runs/answer-pilot-v3-records.jsonl'),
            '--output',str(output)],cwd=Path(directory)/'agent',env=env,check=True)

if __name__=='__main__':main()
