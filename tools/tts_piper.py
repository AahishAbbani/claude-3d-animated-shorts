# Local voice + word timings with Piper (no API key). Run in the work dir:
#   python tts_piper.py [--voices DIR] [--speed 1.0] [--gap 0.28]
# in: script.json {voices:{who: piper-voice-name}, lines:[{id, who, vo}]}
# out: voice.wav + timing.json ({duration, lines:[{id,text,start,end,words:[{w,t,e}]}]}) — the shape captions.py reads.
# Spoken text: numbers/abbreviations are expanded for the voice only (SAY below), the captions keep the written words.
# Word times come from Piper's phoneme alignments (pip install piper-tts onnx), mapped to the written words.
import json, re, wave, argparse, os
import numpy as np
from piper import PiperVoice, SynthesisConfig
ap = argparse.ArgumentParser(); ap.add_argument('--voices', default=os.environ.get('PIPER_VOICES', '.')); ap.add_argument('--speed', type=float, default=1.0); ap.add_argument('--gap', type=float, default=0.28)
a = ap.parse_args()
S = json.load(open('script.json')); LEAD = 0.3
SAY = {'2': 'two', '7': 'seven', '9': 'nine', '19': 'nineteen', 'AM': 'a.m'}
say = lambda w: (lambda m: SAY.get(m[1], m[1]) + m[2])(re.match(r'^(.*?)([.,!?;:]*)$', w))
V = {}; voice = lambda n: V.setdefault(n, PiperVoice.load(os.path.join(a.voices, n + '.onnx'), include_alignments=True))
sr = None; out = [np.zeros(int(22050 * LEAD), np.float32)]; t = LEAD; lines = []; prev = None
for l in S['lines']:
    v = voice(S['voices'][l['who']]); sr = sr or v.config.sample_rate
    if prev and prev != l['who']: out.append(np.zeros(int(sr * 0.18), np.float32)); t += 0.18   # a beat on speaker changes
    toks = l['vo'].split(); spoken = ' '.join(say(w) for w in toks)
    audio, al = [], []
    for ch in v.synthesize(spoken, SynthesisConfig(length_scale=1 / a.speed), include_alignments=True):
        audio.append(ch.audio_float_array); al += ch.phoneme_alignments or []
    au = np.concatenate(audio)
    # voiced phonemes with their start/end sample, then each written token gets its share of them by its own phoneme count
    # (robust to espeak merging words such as "for the" -> one phoneme word)
    ph, pos = [], 0
    for p in al:
        if re.sub(r'[\s.,!?;:—…^$_ˈˌ]', '', p.phoneme): ph.append((pos, pos + p.num_samples))
        pos += p.num_samples
    plen = lambda x: max(1, len(re.sub(r'[\s.,!?;:—…ˈˌ]', '', ''.join(''.join(sen) for sen in v.phonemize(x)))))
    need = [plen(say(w)) for w in toks]; tot = sum(need); words = []; c = 0
    for w, n in zip(toks, need):
        i0 = min(len(ph) - 1, round(c * len(ph) / tot)); i1 = max(i0, min(len(ph) - 1, round((c + n) * len(ph) / tot) - 1)); c += n
        words.append({'w': w, 't': round(t + ph[i0][0] / sr, 3), 'e': round(t + ph[i1][1] / sr, 3)})
    lines.append({'id': l['id'], 'who': l['who'], 'text': l['vo'], 'start': words[0]['t'], 'end': words[-1]['e'], 'words': words})
    out.append(au); t += len(au) / sr
    g = a.gap if l is not S['lines'][-1] else 0.5; out.append(np.zeros(int(sr * g), np.float32)); t += g; prev = l['who']
pcm = (np.clip(np.concatenate(out), -1, 1) * 32767).astype(np.int16)
with wave.open('voice.wav', 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
json.dump({'duration': round(len(pcm) / sr, 3), 'lines': lines}, open('timing.json', 'w'), indent=1)
for l in lines: print(f"{l['id']:>9}: {l['start']:6.2f}-{l['end']:6.2f} {l['text']}")
print('duration', round(len(pcm) / sr, 2))
