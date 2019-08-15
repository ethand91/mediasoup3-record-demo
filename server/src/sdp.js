module.exports.createSdpString = (receiveIp, rtpParameters) => {
  console.log('createSdpString() [receiveIp:%s, rtpParameters:%o]', receiveIp, rtpParameters);

  let sdpString = `v=0
    o=- 0 0 IN IP4 ${receiveIp}
    s=FFmpeg
    c=IN IP4 ${receiveIp}
    t=0 0`
    
  const { audio, video } = rtpParameters;

  if (audio) {
    sdpString += createAudioSdpString(audio);
  }

  if (video) {
    sdpString += createVideoSdpString(video); 
  }

  return sdpString;
};

const createAudioSdpString = (audioRtpParameters) => {
  const audioCodec = audioRtpParameters.codecs[0];
  const { preferredPayloadType, mimeType, clockRate } = audioCodec;
  const codecName = mimeType.replace('audio/', '');

  return `
    m=audio ${audioRtpParameters.rtpPort} RTP/AVP ${preferredPayloadType}
    a=rtpmap:${preferredPayloadType} ${codecName}/${clockRate}
    a=sendonly`;
};

const createVideoSdpString = (videoRtpParameters) => {
  const videoCodec = videoRtpParameters.codecs[0];
  const { preferredPayloadType, mimeType, clockRate } = videoCodec;
  const codecName = mimeType.replace('video/', '');

  return `
    m=video ${videoRtpParameters.rtpPort} RTP/AVP ${preferredPayloadType}
    a=rtpmap:${preferredPayloadType} ${codecName}/${clockRate}
    a=sendonly`;
};
