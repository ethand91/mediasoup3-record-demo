#!/bin/bash

RTP_PORT=$1
RTCP_PORT=$2
SSRC=$3

ffmpeg \
  -loglevel debug \
  -protocol_whitelist udp,rtp \
  -i rtp://192.168.60.99:$RTP_PORT?rtcpport=$RTCP_PORT \
  -c:v libx264 \
  ./test.mp4
