const os = require('os');

module.exports = Object.freeze({
  numWorkers: Object.keys(os.cpus()).length,
  worker: {
    logLevel: 'debug',
    logTags: [
      //'info',
      //'ice',
      //'dtls',
      'rtp',
      'srtp',
      'rtcp',
      //'rtx',
      //'rbe',
      //'score'
    ],
    rtcMinPort: 40000,
    rtcMaxPort: 49999
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000
      },
    ]
  },
  webRtcTransport: {
    listenIps: [ { ip: '192.168.11.4', announcedIp: undefined } ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    maxIncomingBitrate: 1500000
  },
  plainRtpTransport: {
    listenIp: '127.0.0.1',
    rtcpMux: false,
    comedia: false 
  }
});
