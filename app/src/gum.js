const DEFAULT_CONSTRAINTS = Object.freeze({
  audio: true, 
  video: { width: 640, height: 480 }
});

module.exports.GUM = () => {
  const mediaStream = navigator.mediaDevices.getUserMedia(DEFAULT_CONSTRAINTS);
  return mediaStream;
};
