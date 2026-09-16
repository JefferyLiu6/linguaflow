"""Replay old routing experiments from their complete pre-release Git snapshot."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
REVISION='9b6b0c2'


def main():
    p=argparse.ArgumentParser();p.add_argument('version',choices=['2','3','4','5']);p.add_argument('output',type=Path);a=p.parse_args()
    name='routing-answer-dev-v2' if a.version=='2' else f'context-probe-v{a.version}'
    module='evals.rag_v2.runner' if a.version=='2' else f'evals.routing_v{a.version}.probe'
    output=a.output.resolve()
    with tempfile.TemporaryDirectory(prefix='lf-history-') as folder:
        archive=subprocess.run(['git','archive',REVISION],cwd=ROOT,check=True,stdout=subprocess.PIPE).stdout
        subprocess.run(['tar','-xf','-','-C',folder],input=archive,check=True)
        env={k:v for k,v in os.environ.items() if k not in ('OPENAI_API_KEY','DATABASE_URL','LANGFUSE_PUBLIC_KEY','LANGFUSE_SECRET_KEY')}
        env['PYTHONPATH']=str(Path(folder)/'agent')
        subprocess.run([sys.executable,'-m',module,'replay','--plan',str(ROOT/f'agent/runs/{name}-plan.json'),
            '--records',str(ROOT/f'agent/runs/{name}-records.jsonl'),'--output',str(output)],cwd=Path(folder)/'agent',env=env,check=True)

if __name__=='__main__':main()
