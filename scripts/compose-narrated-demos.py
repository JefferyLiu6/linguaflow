"""Compose locally generated narration with captured UI and evidence visuals.

Run after make-demo-gif.mjs, render-ai-walkthrough.mjs, local pipeline.tts,
and align-demo-narration.py. No model calls are made by this compositor.
"""
import argparse
import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/demo'
p = argparse.ArgumentParser()
p.add_argument('--voice-project', type=Path, required=True)
p.add_argument('--work-dir', type=Path, required=True)
a = p.parse_args()
a.work_dir.mkdir(parents=True, exist_ok=True)
aligned = json.loads((a.voice_project / 'aligned.json').read_text())
capture = json.loads((OUT / 'english-study-capture.json').read_text())

def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str,args)], check=True)

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))

def stamp(t, ass=False):
    if ass:
        n = round(t*100)
        return f'{n//360000}:{n//6000%60:02d}:{n//100%60:02d}.{n%100:02d}'
    n = round(t*1000)
    return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d}.{n%1000:03d}'

def ass_file(path, cues, height):
    header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 2560
PlayResY: {height}
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,44,&H00204E20,&H00204E20,&H00F1F5F7,&H00F1F5F7,0,0,0,0,100,100,0,0,1,0,0,2,90,90,55,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    lines=[]
    for cue in cues:
        text=cue['text'].replace('{','').replace('}','').replace('\n',r'\N')
        lines.append(f"Dialogue: 0,{stamp(cue['start']+.2,True)},{stamp(cue['end']+.2,True)},Default,,0,0,0,,{text}")
    path.write_text(header+'\n'.join(lines)+'\n')

source=OUT/'english-study-demo.mp4'
silent=OUT/'english-study-silent.mp4'
if not any(s['codec_type']=='audio' for s in probe(source)['streams']):
    shutil.copy2(source,silent)
if not silent.exists():
    raise SystemExit('Missing silent capture; run make-demo-gif.mjs first')
all_evidence={'voice':aligned['voice'],'pipeline_model':'mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16','cloud_tts_calls':0,'videos':{}}
for kind,filename,height,fps in [('product','english-study-demo.mp4',1800,20),('engineering','ai-system-walkthrough.mp4',1600,30)]:
    cursor=0.; source_cursor=0.; clips=[]; cues=[]; chapters=[]
    for i,row in enumerate(aligned[kind]):
        shot=a.voice_project/'shots'/f"shot_{row['id']:02d}"
        wav=shot/'audio_en.wav'
        if kind=='product':
            # Capture clips are cut on 20 fps boundaries by ffmpeg.
            scene=capture['scenes'][i]
            source_duration=math.floor((scene['end']-scene['start'])*20)/20
            duration=max(source_duration,row['audio_seconds']+.55)
        else:
            source_duration=0
            duration=row['audio_seconds']+.8
        duration=math.ceil(duration*fps)/fps
        ass=a.work_dir/f'{kind}-{i}.ass'
        ass_file(ass,row['cues'],height)
        clip=a.work_dir/f'{kind}-{i}.mp4'
        if kind=='product':
            inputs=['-ss',source_cursor,'-t',source_duration,'-i',silent,'-i',wav]
            vf=f"fps={fps},tpad=stop_mode=clone:stop_duration={max(0,duration-source_duration)+.1},trim=duration={duration},setpts=PTS-STARTPTS,drawbox=x=0:y=1600:w=2560:h=200:color=0xf7f5f1:t=fill,ass='{ass}'"
            source_cursor+=source_duration
        else:
            image=OUT/'ai-system'/f'scene-{i+1:02d}.png'
            inputs=['-loop','1','-framerate',fps,'-i',image,'-i',wav]
            vf=f"fps={fps},pad=2560:1600:0:0:color=0xf7f5f1,fade=t=in:st=0:d=0.18:color=0xf7f5f1,fade=t=out:st={duration-.18}:d=0.18:color=0xf7f5f1,ass='{ass}'"
        run([*inputs,'-vf',vf,'-af',f'loudnorm=I=-18:TP=-1.5:LRA=7,adelay=200,apad,atrim=duration={duration}',
             '-map','0:v:0','-map','1:a:0','-t',duration,'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p',
             '-c:a','aac','-b:a','192k','-ar','48000','-ac','2',clip])
        clip_duration=float(probe(clip)['format']['duration'])
        label=capture['scenes'][i]['label'] if kind=='product' else row['eyebrow']
        chapters.append({'start':round(cursor,3),'end':round(cursor+clip_duration,3),'title':label,'text':row['text'],'heard':row['heard'],'source':row.get('source'),'audio_seconds':row['audio_seconds']})
        cues.extend({'start':cursor+c['start']+.2,'end':min(cursor+clip_duration,cursor+c['end']+.2),'text':c['text']} for c in row['cues'])
        cursor+=clip_duration;clips.append(clip)
        print(f'Composed {kind} scene {i+1}: {clip_duration:.2f}s',flush=True)
    concat=a.work_dir/f'{kind}-clips.txt'
    concat.write_text('\n'.join(f"file '{clip}'" for clip in clips)+'\n')
    chapters_file=a.work_dir/f'{kind}-chapters.txt'
    chapters_file.write_text(';FFMETADATA1\n'+''.join(f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(c['start']*1000)}\nEND={round(c['end']*1000)}\ntitle={c['title']}\n" for c in chapters))
    final=a.work_dir/filename
    run(['-f','concat','-safe','0','-i',concat,'-i',chapters_file,'-map_metadata','1','-map_chapters','1','-c','copy','-movflags','+faststart',final])
    info=probe(final)
    assert any(s['codec_type']=='audio' and s['codec_name']=='aac' for s in info['streams'])
    assert any(s['codec_type']=='video' and s['width']==2560 and s['height']==height for s in info['streams'])
    run(['-i',final,'-f','null','-'])
    shutil.copy2(final,OUT/filename)
    vtt=OUT/('english-study-narration.vtt' if kind=='product' else 'ai-system-walkthrough.vtt')
    vtt.write_text('WEBVTT\n\n'+'\n'.join(f"{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}\n" for c in cues))
    all_evidence['videos'][kind]={'filename':filename,'width':2560,'height':height,'fps':fps,'duration_seconds':float(info['format']['duration']),'audio':'AAC stereo 48 kHz; normalized narration','chapters':chapters,'sha256':hashlib.sha256(final.read_bytes()).hexdigest()}
(OUT/'narrated-walkthroughs.json').write_text(json.dumps(all_evidence,indent=2)+'\n')
print('Both narrated walkthroughs published and decoded successfully.')
