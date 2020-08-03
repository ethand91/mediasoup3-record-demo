const mediasoup = require('mediasoup-client');

const { GUM } = require('./gum');
const Peer = require('./peer');
const SocketQueue = require('./queue');

const mediasoupConfig = require('../../server/src/config');

let peer;
const queue = new SocketQueue();

const socket = new WebSocket(`wss://${window.location.hostname}:3000`);

const handleSocketOpen = async () => {
  console.log('handleSocketOpen()');
};

const handleSocketMessage = async (message) => {
  try {
    const jsonMessage = JSON.parse(message.data);
    handleJsonMessage(jsonMessage);
  } catch (error) {
    console.error('handleSocketMessage() failed [error:%o]', error);
  }
};

const handleSocketClose = () => {
  console.log('handleSocketClose()');
  document.getElementById('startRecordButton').disabled = true;
  document.getElementById('stopRecordButton').disabled = true;
};

const getVideoCodecs = () => {
  let params = new URLSearchParams(location.search.slice(1));
  let videoCodec = params.get('videocodec')
  const codec = mediasoupConfig.router.mediaCodecs.find(c=>{
    if (!videocodec)
      return undefined;

    return ~c.mimeType.toLowerCase().indexOf(videoCodec.toLowerCase())
  });
  return codec !== undefined ? codec : {
                                        kind: 'video',
                                        mimeType: 'video/H264',
                                        clockRate: 90000,
                                        parameters: {
                                          'packetization-mode': 1,
                                          'profile-level-id': '4d0032',
                                          'level-asymmetry-allowed': 1,
                                          'x-google-start-bitrate': 1000
                                        }
                                      };
}

const handleSocketError = error => {
  console.error('handleSocketError() [error:%o]', error);
};

const handleJsonMessage = async (jsonMessage) => {
  const { action } = jsonMessage;

  switch (action) {
    case 'router-rtp-capabilities':
      handleRouterRtpCapabilitiesRequest(jsonMessage);
      break;
    case 'create-transport':
      handleCreateTransportRequest(jsonMessage);
      break;
    case 'connect-transport':
      handleConnectTransportRequest(jsonMessage);
      break;
    case 'produce':
      handleProduceRequest(jsonMessage);
      break;
    default: console.log('handleJsonMessage() unknown action %s', action);
  }
};

const handleRouterRtpCapabilitiesRequest = async (jsonMessage) => {
  const { routerRtpCapabilities, sessionId } = jsonMessage;
  console.log('handleRouterRtpCapabilities() [rtpCapabilities:%o]', routerRtpCapabilities);

  try {
    const device = new mediasoup.Device();
    // Load the mediasoup device with the router rtp capabilities gotten from the server
    await device.load({ routerRtpCapabilities });

    peer = new Peer(sessionId, device);
    createTransport();
  } catch (error) {
    console.error('handleRouterRtpCapabilities() failed to init device [error:%o]', error);
    socket.close();
  }
};

const createTransport = () => {
  console.log('createTransport()');

  if (!peer || !peer.device.loaded) {
    throw new Error('Peer or device is not initialized');
  }

  // First we must create the mediasoup transport on the server side
  socket.send(JSON.stringify({
    action: 'create-transport',
    sessionId: peer.sessionId
  }));
};

// Mediasoup Transport on the server side has been created
const handleCreateTransportRequest = async (jsonMessage) => {
  console.log('handleCreateTransportRequest() [data:%o]', jsonMessage);

  try {
    // Create the local mediasoup send transport
    peer.sendTransport = await peer.device.createSendTransport(jsonMessage);
    console.log('handleCreateTransportRequest() send transport created [id:%s]', peer.sendTransport.id);

    // Set the transport listeners and get the users media stream
    handleSendTransportListeners();
    getMediaStream();
  } catch (error) {
    console.error('handleCreateTransportRequest() failed to create transport [error:%o]', error);
    socket.close();
  }
};

const handleSendTransportListeners = () => {
  peer.sendTransport.on('connect', handleTransportConnectEvent);
  peer.sendTransport.on('produce', handleTransportProduceEvent);
  peer.sendTransport.on('connectionstatechange', connectionState => {
    console.log('send transport connection state change [state:%s]', connectionState);
  });
};

const getMediaStream = async () => {
  const mediaStream = await GUM();
  const videoNode = document.getElementById('localVideo');
  videoNode.srcObject = mediaStream;

  // Get the video and audio tracks from the media stream
  const videoTrack = mediaStream.getVideoTracks()[0];
  const audioTrack = mediaStream.getAudioTracks()[0];

  // If there is a video track start sending it to the server
  if (videoTrack) {

    console.log(`getVideoCodecs():`, getVideoCodecs())

    const videoProducer = await peer.sendTransport.produce({ track: videoTrack, codec: getVideoCodecs() });
    peer.producers.push(videoProducer);
  }

  // if there is a audio track start sending it to the server
  if (audioTrack) {
    const audioProducer = await peer.sendTransport.produce({ track: audioTrack });
    peer.producers.push(audioProducer);
  }

  // Enable the start record button
  document.getElementById('startRecordButton').disabled = false;
};

const handleConnectTransportRequest = async (jsonMessage) => {
  console.log('handleTransportConnectRequest()');
  try {
    const action = queue.get('connect-transport');

    if (!action) {
      throw new Error('transport-connect action was not found');
    }

    await action(jsonMessage);
  } catch (error) {
    console.error('handleTransportConnectRequest() failed [error:%o]', error);
  }
};

const handleProduceRequest = async (jsonMessage) => {
  console.log('handleProduceRequest()');
  try {
    const action = queue.get('produce');

    if (!action) {
      throw new Error('produce action was not found');
    }

    await action(jsonMessage);
  } catch (error) {
    console.error('handleProduceRequest() failed [error:%o]', error);
  }
};

const handleTransportConnectEvent = ({ dtlsParameters }, callback, errback) => {
  console.log('handleTransportConnectEvent()');
  try {
    const action = (jsonMessage) => {
      console.log('connect-transport action');
      callback();
      queue.remove('connect-transport');
    };

    queue.push('connect-transport', action);

    socket.send(JSON.stringify({
      action: 'connect-transport',
      sessionId: peer.sessionId,
      transportId: peer.sendTransport.id,
      dtlsParameters
    }));
  } catch (error) {
    console.error('handleTransportConnectEvent() failed [error:%o]', error);
    errback(error);
  }
};

const handleTransportProduceEvent = ({ kind, rtpParameters }, callback, errback) => {
  console.log('handleTransportProduceEvent()');
  try {
    const action = jsonMessage => {
      console.log('handleTransportProduceEvent callback [data:%o]', jsonMessage);
      callback({ id: jsonMessage.id });
      queue.remove('produce');
    };

    queue.push('produce', action);

    socket.send(JSON.stringify({
      action: 'produce',
      sessionId: peer.sessionId,
      transportId: peer.sendTransport.id,
      kind,
      rtpParameters
    }));
  } catch (error) {
    console.error('handleTransportProduceEvent() failed [error:%o]', error);
    errback(error);
  }
};

socket.addEventListener('open', handleSocketOpen);
socket.addEventListener('message', handleSocketMessage);
socket.addEventListener('error', handleSocketError);
socket.addEventListener('close', handleSocketClose);

module.exports.startRecord = () => {
  console.log('startRecord()');

  socket.send(JSON.stringify({
    action: 'start-record',
    sessionId: peer.sessionId,
  }));

  document.getElementById('startRecordButton').disabled = true;
  document.getElementById('stopRecordButton').disabled = false;
};

module.exports.stopRecord = () => {
  console.log('stopRecord()');

  socket.send(JSON.stringify({
    action: 'stop-record',
    sessionId: peer.sessionId
  }));

  document.getElementById('startRecordButton').disabled = false;
  document.getElementById('stopRecordButton').disabled = true;
};
