const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const { v1: uuidv1 } = require('uuid');

const config = require('./config');
const FFmpeg = require('./ffmpeg');
const GStreamer = require('./gstreamer');
const {
  initializeWorkers,
  createRouter,
  createTransport
} = require('./mediasoup');
const Peer = require('./peer');
const {
  getPort,
  releasePort
} = require('./port');

const PROCESS_NAME = process.env.PROCESS_NAME || 'FFmpeg';
const SERVER_PORT = process.env.SERVER_PORT || 3000;
const HTTPS_OPTIONS = Object.freeze({
  cert: fs.readFileSync('./ssl/server.crt'),
  key: fs.readFileSync('./ssl/server.key')
});

const httpsServer = https.createServer(HTTPS_OPTIONS);
const wss = new WebSocket.Server({ server: httpsServer });
const peers = new Map();

let router;

wss.on('connection', async (socket, request) => {
  console.log('new socket connection [ip%s]', request.headers['x-forwared-for'] || request.headers.origin);

  try {
    const sessionId = uuidv1();
    socket.sessionId = sessionId;
    const peer = new Peer(sessionId);
    peers.set(sessionId, peer);

    const message = JSON.stringify({
      action: 'router-rtp-capabilities',
      routerRtpCapabilities: router.rtpCapabilities,
      sessionId: peer.sessionId
    });

    console.log('router.rtpCapabilities:', router.rtpCapabilities)

    socket.send(message);
  } catch (error) {
    console.error('Failed to create new peer [error:%o]', error);
    socket.terminate();
    return;
  }

  socket.on('message', async (message) => {
    try {
      const jsonMessage = JSON.parse(message);
      console.log('socket::message [jsonMessage:%o]', jsonMessage);

      const response = await handleJsonMessage(jsonMessage);

      if (response) {
        console.log('sending response %o', response);
        socket.send(JSON.stringify(response));
      }
    } catch (error) {
      console.error('Failed to handle socket message [error:%o]', error);
    }
  });

  socket.once('close', () => {
    console.log('socket::close [sessionId:%s]', socket.sessionId);

    const peer = peers.get(socket.sessionId);

    if (peer && peer.process) {
      peer.process.kill();
      peer.process = undefined;
    }
  });
});

const handleJsonMessage = async (jsonMessage) => {
  const { action } = jsonMessage;

  switch (action) {
    case 'create-transport':
      return await handleCreateTransportRequest(jsonMessage);
    case 'connect-transport':
      return await handleTransportConnectRequest(jsonMessage);
    case 'produce':
      return await handleProduceRequest(jsonMessage);
    case 'start-record':
      return await handleStartRecordRequest(jsonMessage);
    case 'stop-record':
      return await handleStopRecordRequest(jsonMessage);
    default: console.log('handleJsonMessage() unknown action [action:%s]', action);
  }
};

const handleCreateTransportRequest = async (jsonMessage) => {
  const transport = await createTransport('webRtc', router);
  transport.dtlsParameters.role = 'client';

  const peer = peers.get(jsonMessage.sessionId);
  peer.addTransport(transport);

  return {
    action: 'create-transport',
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters
  };
};

const handleTransportConnectRequest = async (jsonMessage) => {
  const peer = peers.get(jsonMessage.sessionId);

  if (!peer) {
    throw new Error(`Peer with id ${jsonMessage.sessionId} was not found`);
  }

  const transport = peer.getTransport(jsonMessage.transportId);

  if (!transport) {
    throw new Error(`Transport with id ${jsonMessage.transportId} was not found`);
  }

  await transport.connect({ dtlsParameters: jsonMessage.dtlsParameters });
  console.log('handleTransportConnectRequest() transport connected');
  return {
    action: 'connect-transport'
  };
};

const handleProduceRequest = async (jsonMessage) => {
  console.log('handleProduceRequest [data:%o]', jsonMessage);

  const peer = peers.get(jsonMessage.sessionId);

  if (!peer) {
    throw new Error(`Peer with id ${jsonMessage.sessionId} was not found`);
  }

  const transport = peer.getTransport(jsonMessage.transportId);

  if (!transport) {
    throw new Error(`Transport with id ${jsonMessage.transportId} was not found`);
  }

  const producer = await transport.produce({
    kind: jsonMessage.kind,
    rtpParameters: jsonMessage.rtpParameters
  });

  peer.addProducer(producer);

  console.log('handleProducerRequest() new producer added [id:%s, kind:%s]', producer.id, producer.kind);

  return {
    action: 'produce',
    id: producer.id,
    kind: producer.kind
  };
};

const handleStartRecordRequest = async (jsonMessage) => {
  console.log('handleStartRecordRequest() [data:%o]', jsonMessage);
  const peer = peers.get(jsonMessage.sessionId);

  if (!peer) {
    throw new Error(`Peer with id ${jsonMessage.sessionId} was not found`);
  }

  startRecord(peer);
};

const handleStopRecordRequest = async (jsonMessage) => {
  console.log('handleStopRecordRequest() [data:%o]', jsonMessage);
  const peer = peers.get(jsonMessage.sessionId);

  if (!peer) {
    throw new Error(`Peer with id ${jsonMessage.sessionId} was not found`);
  }

  if (!peer.process) {
    throw new Error(`Peer with id ${jsonMessage.sessionId} is not recording`);
  }

  peer.process.kill();
  peer.process = undefined;

  // Release ports from port set
  for (const remotePort of peer.remotePorts) {
    releasePort(remotePort);
  }
};

const publishProducerRtpStream = async (peer, producer, ffmpegRtpCapabilities) => {
  console.log('publishProducerRtpStream()');

  // Create the mediasoup RTP Transport used to send media to the GStreamer process
  const rtpTransportConfig = config.plainRtpTransport;

  // If the process is set to GStreamer set rtcpMux to false
  if (PROCESS_NAME === 'GStreamer') {
    rtpTransportConfig.rtcpMux = false;
  }

  const rtpTransport = await createTransport('plain', router, rtpTransportConfig);

  // Set the receiver RTP ports
  const remoteRtpPort = await getPort();
  peer.remotePorts.push(remoteRtpPort);

  let remoteRtcpPort;
  // If rtpTransport rtcpMux is false also set the receiver RTCP ports
  if (!rtpTransportConfig.rtcpMux) {
    remoteRtcpPort = await getPort();
    peer.remotePorts.push(remoteRtcpPort);
  }


  // Connect the mediasoup RTP transport to the ports used by GStreamer
  await rtpTransport.connect({
    ip: '127.0.0.1',
    port: remoteRtpPort,
    rtcpPort: remoteRtcpPort
  });

  peer.addTransport(rtpTransport);

  const codecs = [];
  // Codec passed to the RTP Consumer must match the codec in the Mediasoup router rtpCapabilities
  const routerCodec = router.rtpCapabilities.codecs.find(
    codec => codec.kind === producer.kind
  );
  codecs.push(routerCodec);

  const rtpCapabilities = {
    codecs,
    rtcpFeedback: []
  };

  // Start the consumer paused
  // Once the gstreamer process is ready to consume resume and send a keyframe
  const rtpConsumer = await rtpTransport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true
  });

  peer.consumers.push(rtpConsumer);

  return {
    remoteRtpPort,
    remoteRtcpPort,
    localRtcpPort: rtpTransport.rtcpTuple ? rtpTransport.rtcpTuple.localPort : undefined,
    rtpCapabilities,
    rtpParameters: rtpConsumer.rtpParameters
  };
};

const startRecord = async (peer) => {
  let recordInfo = {};

  for (const producer of peer.producers) {
    recordInfo[producer.kind] = await publishProducerRtpStream(peer, producer);
  }

  recordInfo.fileName = Date.now().toString();

  peer.process = getProcess(recordInfo);

  setTimeout(async () => {
    for (const consumer of peer.consumers) {
      // Sometimes the consumer gets resumed before the GStreamer process has fully started
      // so wait a couple of seconds
      await consumer.resume();
      await consumer.requestKeyFrame();
    }
  }, 1000);
};

// Returns process command to use (GStreamer/FFmpeg) default is FFmpeg
const getProcess = (recordInfo) => {
  switch (PROCESS_NAME) {
    case 'GStreamer':
      return new GStreamer(recordInfo);
    case 'FFmpeg':
    default:
      return new FFmpeg(recordInfo);
  }
};

(async () => {
  try {
    console.log('starting server [processName:%s]', PROCESS_NAME);
    await initializeWorkers();
    router = await createRouter();

    httpsServer.listen(SERVER_PORT, () =>
      console.log('Socket Server listening on port %d', SERVER_PORT)
    );
  } catch (error) {
    console.error('Failed to initialize application [error:%o] destroying in 2 seconds...', error);
    setTimeout(() => process.exit(1), 2000);
  }
})();
