#!/bin/bash

VIDEO_RTP_PORT=20000
VIDEO_RTCP_PORT=20001
VIDEO_SEND_RTCP_PORT=$1

AUDIO_RTP_PORT=20002
AUDIO_RTCP_PORT=20003
AUDIO_SEND_RTCP_PORT=$2

VIDEO_CAPS="application/x-rtp, media=(string)video, clock-rate=(int)90000, payload=(int)101, encoding-name=(string)VP8"

AUDIO_CAPS="application/x-rtp, media=(string)audio, clock-rate=(int)48000, payload=(int)100, encoding-name=(string)OPUS"

  #udpsrc port=$VIDEO_RTCP_PORT ! \
  #rtpbin.recv_rtcp_sink_0 rtpbin.send_rtcp_src_0 ! \
  #udpsink port=$VIDEO_SEND_RTCP_PORT sync=false async=false \
  #udpsrc port=$AUDIO_RTCP_PORT ! \
  #rtpbin.recv_rtcp_sink_1 rtpbin.send_rtcp_src_1 ! \
  #udpsink port=$AUDIO_SEND_RTCP_PORT sync=false async=false \
# rtpbin name=rtpbin latency=50 buffer-mode=2 ! \
GST_DEBUG=4 gst-launch-1.0 -em \
  rtpbin name=rtpbin ! \
  udpsrc port=$VIDEO_RTP_PORT caps="$VIDEO_CAPS" ! \
  rtpbin.recv_rtp_sink_0 rtpbin. ! \
  queue ! \
  rtpvp8depay ! \
  mux. \
  udpsrc port=$AUDIO_RTP_PORT caps="$AUDIO_CAPS" ! \
  rtpbin.recv_rtp_sink_1 rtpbin. ! \
  queue ! \
  rtpopusdepay ! \
  opusdec ! \
  opusenc ! \
  mux. \
  webmmux name=mux ! \
  filesink location=./test.webm \
  udpsrc port=$VIDEO_RTCP_PORT ! \
  rtpbin.recv_rtcp_sink_0 rtpbin.send_rtcp_src_0 ! \
  udpsink port=$VIDEO_SEND_RTCP_PORT sync=false async=false \
  udpsrc port=$AUDIO_RTCP_PORT ! \
  rtpbin.recv_rtcp_sink_1 rtpbin.send_rtcp_src_1 ! \
  udpsink port=$AUDIO_SEND_RTCP_PORT sync=false async=false
