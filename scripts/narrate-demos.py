"""Add local narration to the product recording and build the AI-system tour.

Requires the user's existing ai-video-pipeline installation and cached models.
Does not install packages, download models, or call a cloud voice API.
"""
import argparse
import json
import os
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--pipeline-root',type=Path,required=True)
p.add_argument('--work-dir',type=Path,required=True)
a=p.parse_args()
pipeline=a.pipeline_root.resolve();work=a.work_dir.resolve();voice=work/'voice'
voice.mkdir(parents=True,exist_ok=True)
python=pipeline/'tools/audio/.venv/bin/python'
if not python.exists():raise SystemExit('Use an existing ai-video-pipeline installation with its audio environment.')
config=pipeline/'config.yaml'
# Read storage settings with the pipeline's own installed YAML dependency.
settings=json.loads(subprocess.check_output([str(python),'-c','import yaml,json,sys; print(json.dumps(yaml.safe_load(open(sys.argv[1]))["storage"]))',str(config)]))
env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONPATH':str(pipeline),'HF_HOME':str(Path(settings['ssd_root'])/'models/huggingface'),'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1'}
script=ROOT/'docs/demo/narration-script.json'
data=json.loads(script.read_text())
(voice/'storyboard.json').write_text(json.dumps({'shots':[{'id':r['id'],'duration_s':10,'narration':{'en':r['text']}} for r in data['product']+data['engineering']]},indent=2)+'\n')
commands=[
 ['node',str(ROOT/'scripts/render-ai-walkthrough.mjs')],
 [str(python),'-m','pipeline.tts','--config',str(config),'--project',str(voice),'--langs','en'],
 [str(python),str(ROOT/'scripts/align-demo-narration.py'),'--script',str(script),'--voice-project',str(voice)],
 [str(python),str(ROOT/'scripts/compose-narrated-demos.py'),'--voice-project',str(voice),'--work-dir',str(work/'composed')],
]
for cmd in commands:subprocess.run(cmd,cwd=ROOT,env=env,check=True)
print('Narration, captions and both videos are ready in docs/demo.')
