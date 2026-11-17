"""Align the local pipeline's generated narration; run with its audio Python."""
import argparse
import json
from pathlib import Path
from pipeline.subtitles import transcribe_words, split_en, align

parser = argparse.ArgumentParser()
parser.add_argument('--script', type=Path, required=True)
parser.add_argument('--voice-project', type=Path, required=True)
args = parser.parse_args()
data = json.loads(args.script.read_text())
for row in data['product'] + data['engineering']:
    folder = args.voice_project / 'shots' / f"shot_{row['id']:02d}"
    timing = transcribe_words(folder / 'audio_en.wav', 'en', 'mlx-community/whisper-large-v3-turbo', folder / 'words_en.json', row['text'])
    chunks = split_en(row['text'], 72)
    row['heard'] = timing['heard']
    row['audio_seconds'] = timing['duration']
    row['cues'] = [{'start': a, 'end': b, 'text': text} for (a, b), text in zip(align(chunks, timing), chunks)]
    print(f"Aligned {row['id']}: {timing['heard']}", flush=True)
(args.voice_project / 'aligned.json').write_text(json.dumps(data, indent=2)+'\n')
