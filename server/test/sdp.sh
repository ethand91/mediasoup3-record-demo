#!/bin/bash

RTP_PORT=$1
RTCP_PORT=$2
SSRC=$3

ffmpeg \
  -loglevel debug \
  -protocol_whitelist file,udp,rtp \
  -i test.sdp \
  -vsync \
  cfr \
  -c:v copy \
  ./test.webm
