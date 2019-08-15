const child_process = require('child_process');
const { EventEmitter } = require('events');

const DEFAULT_PRESET = 'veryslow';

module.exports = class Ffmpeg {
  constructor (sdpInput, container = 'mp4') {
    this.sdpInput = sdpInput
    this.container = container;
    this.process = undefined;
    this.observer = new EventEmitter(); 
    this.createProcess();
  }

  createProcess () {
    this.process = child_process.spawn('ffmpeg', this.commandArgs);

    if (this.process.stderr) {
      this.process.stderr.setEncoding('utf-8');
    }

    this.process.stderr.on('data', (data) => {
      console.log('ffmpeg::process:stderr [data:%o]', data);
    });

    this.process.stdin.on('data', data => console.log('ffmpeg::process:data [data:%o]', data));

    this.process.stdin.on('error', error => console.error('ffmpeg::process::error [error:%o]', error));

    this.process.stdout.on('error', error => console.error('ffmpeg::process:stdin::error [error:%o]', error));

    this.process.on('message', (message) => console.log('ffmpeg::process [message:%o]', message));

    this.process.on('error', error => console.error('ffmpeg::process [error]%o]', error));

    this.process.once('close', () => {
      console.log('ffmpeg::process closed');
      this.observer.emit('close');
    });

    this.sdpInput.resume();
    this.sdpInput.pipe(this.process.stdin);
  }

  kill () {
    console.log('kill');
    this.process.kill('SIGINT');
  }

  get commandArgs () {
    return [
      '-re',
      '-loglevel',
      'debug',
      '-protocol_whitelist',
      'udp,rtp,pipe',
      //'-use_wallclock_as_timestamps',
      //'1',
      '-f',
      'sdp',
      '-i',
      'pipe:0',
      '-pix_fmt',
      'yuv420p',
      '-g',
      '60',
      '-vsync',
      'cfr',
      '-c:v',
      'h264_videotoolbox',
      '-filter:v',
      'fps=fps=30',
      '-movflags',
      '+faststart',
      './test.mp4'
    ];
  }
}
