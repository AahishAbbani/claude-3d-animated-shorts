#!/usr/bin/env bash
# Render the study short in its three parts (dorm → exam room → dorm), each on its own set, then join them.
#   bash tools/render-study.sh [W] [H]     (default 720x1280; software WebGL is ~4 s/frame at 720p)
# out: engine/out/study/video.mp4 (silent; tools/finish-study.sh adds voice + captions)
set -euo pipefail
cd "$(dirname "$0")/../engine"
W=${1:-720}; H=${2:-1280}; FPS=30; OUTD=out/study; mkdir -p $OUTD
read B1 B2 N < <(node -e "const T=require('./film/study_timing.json'),L=Object.fromEntries(T.lines.map(l=>[l.id,l]));const f=x=>Math.round(x*30);console.log(f(Math.round((L.blank.start-0.2)*30)/30),f(Math.round((L.adeno.start-0.25)*30)/30),Math.round(T.duration*30))")
echo "parts: home 0-$B1, office $B1-$B2, home $B2-$N"
XQ="&viewer=1&study=1&set=home"   F0=0   F1=$B1 node render.cjs $OUTD/p1.mp4 $W $H $FPS
XQ="&viewer=1&study=1&set=office" F0=$B1 F1=$B2 node render.cjs $OUTD/p2.mp4 $W $H $FPS
XQ="&viewer=1&study=1&set=home"   F0=$B2 F1=$N  node render.cjs $OUTD/p3.mp4 $W $H $FPS
printf "file 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > $OUTD/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i $OUTD/parts.txt -c copy $OUTD/video.mp4
echo "-> engine/$OUTD/video.mp4"
