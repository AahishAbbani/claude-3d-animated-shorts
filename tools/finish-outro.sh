#!/usr/bin/env bash
# Tide end tag: render (720p), then voice + captions -> shorts/study-2am/outro/outro.mp4, and the stitched full ad.
#   XQ="&viewer=1&study=1&set=home&outro=1" node engine/render.cjs out/study/outro.mp4 720 1280 30   (run in engine/)
#   bash tools/finish-outro.sh
set -euo pipefail
cd "$(dirname "$0")/../shorts/study-2am/outro"
CAP_Y=0.52 python3 ../../../tools/captions.py
ffmpeg -v error -y -i ../../../engine/out/study/outro.mp4 -i cap/overlay.mov -i voice.wav \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos,format=yuv420p[v];[v][1:v]overlay=0:0:format=auto[o];[2:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[o]" -map "[a]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest outro.mp4
# stitched: main short + end tag (re-encoded so both halves share one stream format)
ffmpeg -v error -y -i ../final.mp4 -i outro.mp4 -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart ../final_with_tide.mp4
echo "-> outro/outro.mp4 + final_with_tide.mp4"
