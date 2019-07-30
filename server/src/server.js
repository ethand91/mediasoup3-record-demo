const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const uuidv1 = require('uuid/v1');

const {
  initializeWorkers,
  createRouter,
  createTransport
} = require('./mediasoup');
const Peer = require('./peer');

const HTTPS_OPTIONS = Object.freeze({
  cert: fs.readFileSync('./ssl/server.crt'),
  key: fs.readFileSync('./ssl/server.key')
});

const httpsServer = https.createServer(HTTPS_OPTIONS);
const wss = new WebSocket.Server({ server: httpsServer });
const peers = [];

const heartbeat = socket => socket.isAlive = true;

let router;

wss.on('connection', async (socket, request) => {
  console.log('new socket connection [ip%s]', request.headers['x-forwared-for'] || request.headers.origin);

  socket.isAlive = true;

  try {
    const peer = new Peer(uuidv1());
    peers.push(peer);

    const message = JSON.stringify({
      action: 'router-rtp-capabilities',
      routerRtpCapabilities: router.rtpCapabilities,
      sessionId: peer.sessionId
    });
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
    default: console.log('handleJsonMessage() unknown action [action:%s]', action);
  }
};

const handleCreateTransportRequest = async (jsonMessage) => {
  const transport = await createTransport('webRtc', router);

  const peer = peers.filter(peer => peer.sessionId === jsonMessage.sessionId)[0];
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
  const peer = peers.filter(peer => peer.sessionId === jsonMessage.sessionId)[0];

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

  const peer = peers.filter(peer => peer.sessionId === jsonMessage.sessionId)[0];

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

/*
setInterval(() => {
  for (const socket of wss.clients) {
    if (!Boolean(socket.isAlive)) {
      console.log('disconnect socket due to ping/pong timeout');
      return socket.terminate();
    }

    socket.isAlive = false;
    socket.ping(() => {});
  }
}, 3000);
*/

(async () => {
  try {
    await initializeWorkers();
    router = await createRouter();

    httpsServer.listen(3000, () =>
      console.log('Socket Server listening on port 3000')
    );
  } catch (error) {
    console.error('Failed to initialize application [error:%o] destroying in 2 seconds...', error);
    setTimeout(() => process.exit(1), 2000);
  }
})();
