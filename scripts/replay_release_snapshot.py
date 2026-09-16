"""Replay a release artifact with its recorded committed source, without credentials."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]


def main():
    p=argparse.ArgumentParser();p.add_argument('--plan',type=Path,required=True);p.add_argument('--records',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    plan=a.plan.resolve();records=a.records.resolve();out=a.output.resolve()
    revision=json.loads(plan.read_text())['git_revision']
    if not re.fullmatch('[0-9a-f]{40}',revision):raise ValueError('Expected exact committed revision')
    with tempfile.TemporaryDirectory(prefix='lf-release-snapshot-') as folder:
        archive=subprocess.run(['git','archive',revision],cwd=ROOT,check=True,stdout=subprocess.PIPE).stdout
        subprocess.run(['tar','-xf','-','-C',folder],input=archive,check=True)
        env={k:v for k,v in os.environ.items() if k not in ('OPENAI_API_KEY','DATABASE_URL','LANGFUSE_PUBLIC_KEY','LANGFUSE_SECRET_KEY')}
        env['PYTHONPATH']=str(Path(folder)/'agent')
        subprocess.run([sys.executable,'-m','evals.release.runner','replay','--plan',str(plan),'--records',str(records),'--output',str(out)],cwd=Path(folder)/'agent',env=env,check=True)

if __name__=='__main__':main()
