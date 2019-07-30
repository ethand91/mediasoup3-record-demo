const child_process = require('child_process');

const DEFAULT_PRESET = 'veryslow';

module.exports = class Ffmpeg {
  constructor (rtpParameters, container = 'mp4') {
    this.rtpParameters = rtpParameters;
    this.container = container;
    this.process = undefined;
  }

  get audioCodec () {
    return 'libfdk_aac';
  }

  get videoCodec () {
    return 'libx264';
  }
}
