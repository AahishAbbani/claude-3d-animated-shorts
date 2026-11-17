#!/usr/bin/env bash
# Join picture + voice + word captions into the final upload: shorts/study-2am/final.mp4 (1080x1920, -14 LUFS).
#   bash tools/finish-study.sh            (after tools/render-study.sh; captions are rebuilt from timing.json)
set -euo pipefail
cd "$(dirname "$0")/../shorts/study-2am"
CAP_Y=${CAP_Y:-0.78} python3 ../../tools/captions.py
ffmpeg -v error -y -i ../../engine/out/study/video.mp4 -i cap/overlay.mov -i voice.wav \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos,format=yuv420p[v];[v][1:v]overlay=0:0:format=auto[o];[2:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[o]" -map "[a]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest final.mp4
echo "-> shorts/study-2am/final.mp4"
