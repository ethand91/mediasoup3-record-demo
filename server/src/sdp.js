// File to create SDP text from mediasoup RTP Parameters

module.exports.createSdpText = (rtpParameters) => {
  const { video, audio } = rtpParameters;

  return `v=0
  o=- 0 0 IN IP4 127.0.0.1
  s=FFmpeg
  c=IN IP4 127.0.0.1
  t=0 0
  m=video ${video.remoteRtpPort} RTP/AVP 101
  a=rtpmap:101 VP8/90000
  a=sendonly
  m=audio ${audio.remoteRtpPort} RTP/AVP 100
  a=rtpmap:100 opus/48000/2
  a=sendonly
  `;
};
