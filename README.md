# Claude 3D Animated Shorts

A Claude skill for vertical animated story Shorts with **real 3D characters**, built with three.js and rendered frame by frame on your own machine. No AI video generator is involved.

It started as a copy of [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) (MIT). That skill uses 2D billboard characters in a 3D world. This one keeps the workflow and moves everything to 3D: every character is a rigged 3D model you can orbit around, pose and animate.

The look and the story formula follow the **RicksClips** YouTube channel ([@RicksClips3000](https://www.youtube.com/@RicksClips3000/shorts)). That means white-headed cartoon people with deadpan faces, a lit 3D world in a darker, warmer, cinematic key, word-by-word captions, and the "odd act → mockery → disaster → science + analogy → loop" script. This project is not affiliated with RicksClips. Only the style is studied. No frames or content from the channel are included.

![office set](references/images/office-set.png)

| | |
|---|---|
| ![skit](references/images/skit-tra-loi-tat-ca.jpg) | ![close-up](references/images/character-closeup.png) |

## What's inside
| Path | What it is |
|---|---|
| `SKILL.md` | The skill: pipeline, character rules, look values, QA |
| `engine/stickrig.js` | Character builder on a Mixamo rig. Includes white flat-shaded heads with a brush outline in screen pixels, pear/bean bodies, outfits (hoodie, vest, polo, tunic), fabric patterns, ties and bow ties, hats, noodle limbs, mitten hands, IK and drawn faces |
| `engine/main.js` | Scenes: the rail film, the office/home review page (`?viewer=1`), a 10 s office skit (`?viewer=1&skit=1`) and a Wild West chase test (`?chase=1&dur=10`) |
| `engine/world.js`, `engine/post.js` | World and train builder; post chain with ACES grade, bloom, DOF, SMAA and n8ao ambient occlusion |
| `engine/assets/props/` | Kenney Furniture Kit and KayKit Furniture Bits (both CC0), used for the office and home sets |
| `tools/` | ElevenLabs voice with word timings, tempo fit, word-by-word captions, contact sheets |
| `upstream-2d/` | The original 2D skill, audio and scripts from mromidev (MIT), for reference |

## Install
```bash
git clone https://github.com/thuann-vn/claude-3d-animated-shorts ~/.claude/skills/claude-3d-animated-shorts
cd ~/.claude/skills/claude-3d-animated-shorts
bash scripts/fetch-assets.sh          # Xbot rig, horse, fonts (not redistributed here)
cd engine && npm install
```
You need Node 18+, Python 3 with Pillow, ffmpeg, and Chrome or Chromium. If render.cjs can't find the browser, set `CHROME=/path/to/chrome`.

## Try it
```bash
cd engine
npx http-server -p 5310 -c-1 .
# open http://localhost:5310/viewer.html               → orbit/zoom the cast in the office
#      http://localhost:5310/viewer.html?set=home      (append to the redirected URL) → living room + kitchen
XQ="&viewer=1&skit=1" node render.cjs out/skit.mp4 1080 1920 30   # the 10 s office skit
```
Then in Claude Code say: *"Use the 3D animated shorts skill and make a 40 s short about …"*.

## Example: "Your brain at 2 AM" (study short)
A ~50 s explainer on what staying up until 2 AM studying does to your brain: adenosine and sleep pressure, why coffee only masks it, 19 hours awake ≈ 0.05% blood alcohol (Williamson & Feyer, 2000), and how deep sleep moves new memories from the hippocampus to the cortex. It is built on the same engine: a night dorm (`set=home`), an exam room (`set=office`), and animated science panels drawn over the 3D frame.

| Path | What it is |
|---|---|
| `shorts/study-2am/script.json` | Lines, speakers and the shot note for each line |
| `engine/study.js` | Props, night lighting, shots and the science panels (`index.html?viewer=1&study=1&set=home`) |
| `tools/tts_piper.py` | Local voice with [Piper](https://github.com/OHF-Voice/piper1-gpl) (no API key), word timings from its phoneme alignments |
| `tools/render-study.sh`, `tools/finish-study.sh` | Render the three parts on their sets, then add the voice and the word captions |

```bash
python3 -m venv ~/piper && ~/piper/bin/pip install piper-tts onnx
(cd ~/piper && bin/python -m piper.download_voices en_US-ryan-high en_US-joe-medium en_US-amy-medium)
cd shorts/study-2am && ~/piper/bin/python ../../tools/tts_piper.py --voices ~/piper --speed 1.08 && cp timing.json ../../engine/film/study_timing.json
cd ../.. && bash tools/render-study.sh 720 1280 && bash tools/finish-study.sh   # -> shorts/study-2am/final.mp4
```
On Linux without a GPU, render.cjs uses SwiftShader (about 4 s per 720p frame), so the finish step upscales to 1080x1920.

## Credits
- Workflow and audio tools: [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) (MIT)
- Style reference: the RicksClips YouTube channel (style only, not affiliated)
- Furniture: [Poly Haven](https://polyhaven.com) scans (CC0, fetched by the script), [Kenney](https://kenney.nl) Furniture Kit and [KayKit](https://kaylousberg.itch.io/furniture-bits) Furniture Bits (CC0)
- Rig: Xbot from the three.js examples (Mixamo). Horse from the three.js examples. Both are downloaded by the fetch script, not included here.

## Support

If this skill saved you some time, you can [buy me a coffee](https://buymeacoffee.com/thua9678) ☕

## License
MIT for the code and docs (see `LICENSE`). Third-party assets keep their own licenses.
