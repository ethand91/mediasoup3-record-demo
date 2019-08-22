const DEFAULT_CONSTRAINTS = Object.freeze({
  audio: true, 
  video: { width: 640, height: 480 }
});

// Gets the users camera and returns the media stream
module.exports.GUM = async () => {
  return await navigator.mediaDevices.getUserMedia(DEFAULT_CONSTRAINTS);
};
