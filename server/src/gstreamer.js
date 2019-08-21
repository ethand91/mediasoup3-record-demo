const child_process = require('child_process');
const { EventEmitter } = require('events');
const shell = require('shelljs');

const RECORD_FILE_LOCATION_PATH = process.env.RECORD_FILE_LOCATION_PATH || './files';

const GSTREAMER_DEBUG_LEVEL = process.env.GSTREAMER_DEBUG_LEVEL || 3;
const GSTREAMER_COMMAND = 'gst-launch-1.0';
const GSTREAMER_OPTIONS = '-v -e';

const VIDEO_CAPS = 'application/x-rtp,media=(string)video,clock-rate=(int)90000,payload=(int)101,encoding-name=(string)VP8';
const AUDIO_CAPS = 'application/x-rtp,media=(string)audio,clock-rate=(int)48000,payload=(int)100,encoding-name=(string)OPUS';

module.exports = class GStreamer {
  constructor (rtpParameters) {
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._observer = new EventEmitter();
    this._createProcess();
  }

  _createProcess () {
    const exe = `GST_DEBUG=${GSTREAMER_DEBUG_LEVEL} GST_DEBUG_DUMP_DOT_DIR=./dump ${GSTREAMER_COMMAND} ${GSTREAMER_OPTIONS}`;
    this._process = child_process.spawn(exe, this._commandArgs, {
      detached: false,
      shell: true
    });

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');
    }

    if (this._process.stdout) {
      this._process.stdout.setEncoding('utf-8');
    }

    this._process.on('message', message =>
      console.log('gstreamer::process::message [pid:%d, message:%o]', this._process.pid, message)
    );

    this._process.on('error', error =>
      console.error('gstreamer::process::error [pid:%d, error:%o]', this._process.pid, error)
    );

    this._process.once('close', () => {
      console.log('gstreamer::process::close [pid:%d]', this._process.pid);
      this._observer.emit('process-close');
    });

    this._process.stderr.on('data', data =>
      console.log('gstreamer::process::stderr::data [data:%o]', data)
    );

    this._process.stdout.on('data', data =>
      console.log('gstreamer::process::stdout::data [data:%o]', data)
    );
  }

  kill () {
    console.log('kill() [pid:%d]', this._process.pid);
    this._process.kill('SIGINT');
  }

  get _commandArgs () {
    let commandArgs = [
      'rtpbin name=rtpbin latency=50 buffer-mode=2',
      '!'
    ];

    commandArgs = commandArgs.concat(this._videoArgs);
    commandArgs = commandArgs.concat(this._audioArgs);
    commandArgs = commandArgs.concat(this._sinkArgs);
    commandArgs = commandArgs.concat(this._rtcpArgs);

    console.log('ARGS', commandArgs);
    return commandArgs;
  }

  get _videoArgs () {
    const { video } = this._rtpParameters;

    return [
      `udpsrc port=${video.rtpPort} caps="${VIDEO_CAPS}"`,
      '!',
      'rtpbin.recv_rtp_sink_0 rtpbin.',
      '!',
      'queue',
      '!',
      'rtpvp8depay',
      '!',
      'mux.'
    ];
  }

  get _audioArgs() {
    const { audio } = this._rtpParameters;

    return [
      `udpsrc port=${audio.rtpPort} caps="${AUDIO_CAPS}"`,
      '!',
      'rtpbin.recv_rtp_sink_1 rtpbin.',
      '!',
      'queue',
      '!',
      'rtpopusdepay',
      '!',
      'opusdec',
      '!',
      'opusenc',
      '!',
      'mux.'
    ];
  }

  get _rtcpArgs () {
    const { video, audio } = this._rtpParameters;

    return [
      `udpsrc port=${video.rtcpPort}`,
      '!',
      'rtpbin.recv_rtcp_sink_0 rtpbin.send_rtcp_src_0',
      '!',
      `udpsink port=${video.localRtcpPort} sync=false async=false`,
      `udpsrc port=${audio.rtcpPort}`,
      '!',
      'rtpbin.recv_rtcp_sink_1 rtpbin.send_rtcp_src_1',
      '!',
      `udpsink port=${audio.localRtcpPort} sync=false async=false`
    ];
  }

  get _sinkArgs () {
    return [
      'webmmux name=mux',
      '!',
      `filesink location=${RECORD_FILE_LOCATION_PATH}/${this._rtpParameters.fileName}.webm`
    ];
  }
}
