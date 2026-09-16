"""Run the four existing authored contrasts with the indexed judge (development only)."""
import asyncio
import json
from pathlib import Path
import sys
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'agent'))
from evals.rag import judge_checks
from evals.rag_v2 import judge as indexed
from evals.rag_v2.runner import identity
from evals.rag.runner import write_new

async def run():
    pacer=indexed.TokenPacer()
    async def evaluate(case,answer,contexts,spans):
        return await indexed.judge(case,answer,contexts,spans,pacer)
    with patch.object(judge_checks,'judge',evaluate):
        result=await judge_checks.run(ROOT/'agent/evals/datasets/answer-pilot-v1.json')
    result['code']=identity()
    result['purpose']='Development sanity checks reused from judge v1; not independent calibration.'
    return result

if __name__=='__main__':
    output=Path(sys.argv[1])
    if output.exists():raise ValueError('Preserve existing result')
    from dotenv import load_dotenv
    load_dotenv(ROOT/'agent/.env')
    result=asyncio.run(run());write_new(output,result)
    print([(r['name'],r['check_passed']) for r in result['rows']])
