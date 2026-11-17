# Re-voice a finished short with ElevenLabs WITHOUT re-rendering the picture. Run in the work dir:
#   python3 tts_eleven_fit.py [--ref timing_piper.json] [--model eleven_multilingual_v2]
# Each line of script.json is spoken on its own (/with-timestamps), its voiced part is time-stretched to the same
# [start, end] slot the reference timing gave that line, and placed there. The shots stay in sync because they were
# cut to the reference timing. out: voice.wav + timing.json (word times on the new audio, for captions.py)
# Key: ELEVENLABS_API_KEY, or a proxy that injects xi-api-key (then any placeholder works).
# script.json "eleven": {who: voice_id}. Lines whose stretch would pass ±25% are reported: rewrite them, don't force them.
import json, os, base64, subprocess, argparse, urllib.request, tempfile
import numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('--ref', default='timing_piper.json'); ap.add_argument('--model', default='eleven_multilingual_v2')
ap.add_argument('--stability', type=float, default=0.45); a = ap.parse_args()
S = json.load(open('script.json')); REF = {l['id']: l for l in json.load(open(a.ref))['lines']}; DUR = json.load(open(a.ref))['duration']
KEY = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected'); SR = 44100; tmp = tempfile.mkdtemp()
def tts(text, voice):
    body = json.dumps({'text': text, 'model_id': a.model, 'voice_settings': {'stability': a.stability, 'similarity_boost': 0.75, 'style': 0.15}}).encode()
    rq = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128', data=body, headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(rq, timeout=120).read())
out = np.zeros(int(SR * DUR) + SR, np.float32); lines = []
for l in S['lines']:
    r0 = REF[l['id']]; j = tts(l['vo'], S['eleven'][l['who']]); al = j['alignment']; ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    mp3 = os.path.join(tmp, l['id'] + '.mp3'); open(mp3, 'wb').write(base64.b64decode(j['audio_base64']))
    # words from the character alignment
    words, cur = [], None
    for c, s, e in zip(ch, st, en):
        if c.isspace():
            if cur: words.append(cur); cur = None
        else: cur = cur or {'w': '', 't': s}; cur['w'] += c; cur['e'] = e
    if cur: words.append(cur)
    s0, s1 = words[0]['t'], words[-1]['e']; tail = 0.12
    k = (s1 - s0) / max(0.2, r0['end'] - r0['start'])   # >1 → speed up
    flag = '' if 0.75 <= k <= 1.25 else '   !! stretch outside ±25%: shorten or lengthen this line'
    wav = os.path.join(tmp, l['id'] + '.wav')
    chain, kk = [], k
    while kk > 2.0: chain.append('atempo=2.0'); kk /= 2
    while kk < 0.5: chain.append('atempo=0.5'); kk /= 0.5
    chain.append(f'atempo={kk:.5f}')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-af', f'atrim={max(0, s0 - 0.03):.3f}:{s1 + tail:.3f},asetpts=PTS-STARTPTS,{",".join(chain)},afade=t=out:st={max(0, (s1 - s0) / k):.3f}:d={tail / k:.3f}',
                    '-ar', str(SR), '-ac', '1', '-f', 'f32le', wav], check=True)
    au = np.fromfile(wav, np.float32); i0 = int((r0['start'] - 0.03 / k) * SR); out[i0:i0 + len(au)] += au[:max(0, len(out) - i0)]
    nw = [{'w': w['w'], 't': round(r0['start'] + (w['t'] - s0) / k, 3), 'e': round(r0['start'] + (w['e'] - s0) / k, 3)} for w in words]
    lines.append({'id': l['id'], 'who': l['who'], 'text': l['vo'], 'start': nw[0]['t'], 'end': nw[-1]['e'], 'words': nw})
    print(f"{l['id']:>9}: x{k:.2f}  {r0['start']:6.2f}-{r0['end']:6.2f}  {l['vo']}{flag}")
out = out[:int(SR * DUR)]; peak = np.abs(out).max(); out = out / peak * 0.89 if peak > 0.89 else out
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', 'voice.wav'], input=out.astype(np.float32).tobytes(), check=True)
json.dump({'duration': DUR, 'lines': lines, 'voice': 'elevenlabs', 'model': a.model}, open('timing.json', 'w'), indent=1)
print('voice.wav + timing.json', DUR, 's')
