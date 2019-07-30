const { GUM } = require('./gum');
const {
  createDevice,
  createSendTransport
} = require('./mediasoup');
const Peer = require('./peer');
const SocketQueue = require('./queue');

let peer;
const queue = new SocketQueue();

window.onload = () => {
  const socket = new WebSocket(`wss://${window.location.hostname}:3000`);
  const localVideoNode = document.getElementById('localVideo');

  const handleSocketOpen = async () => {
    console.log('handleSocketOpen()');
    //const mediaStream = await GUM(); 
    //localVideo.srcObject = mediaStream;

    // Get room router capabilities

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
  };

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
      const device = await createDevice(routerRtpCapabilities);
      console.log('handleRouterRtpCapabilities() device created');
      peer = new Peer(sessionId, device);
      publish();
    } catch (error) {
      console.error('handleRouterRtpCapabilities() failed to init device [error:%o]', error);
      socket.close();
    }
  };

  const publish = () => {
    console.log('publish()');

    if (!peer || !peer.device.loaded) {
      throw new Error('Peer or device is not initialized');
    }

    socket.send(JSON.stringify({
      action: 'create-transport',
      sessionId: peer.sessionId
    }));
  };

  const handleCreateTransportRequest = async (jsonMessage) => {
    console.log('handleCreateTransportRequest() [data:%o]', jsonMessage);

    try {
      peer.sendTransport = await createSendTransport(peer.device, jsonMessage); 
      console.log('handleCreateTransportRequest() send transport created [id:%s]', peer.sendTransport.id);

      handleSendTransportListeners();
      getMediaStream();
    } catch (error) {
      console.error('handleCreateTransportRequest() failed to create transport [error:%o]', error);
      socket.close();
    }
  };

  const handleConnectTransportRequest = async (jsonMessage) => {
    console.log('handleTransportConnectRequest()');
    try {
      const action = queue.get('connect-transport');

      if (!action) {
        throw new Error('transport-connect action was not found');
      }

      console.log('action', action);
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

  const getMediaStream = async () => {
    const mediaStream = await GUM();
    const videoNode = document.getElementById('localVideo');
    videoNode.srcObject = mediaStream;

    const videoTrack = mediaStream.getVideoTracks()[0];
    const audioTrack = mediaStream.getAudioTracks()[0];

    if (videoTrack) {
      const videoProducer = await peer.sendTransport.produce({ track: videoTrack });
      peer.producers.push(videoProducer);
    }

    if (audioTrack) {
      const audioProducer = await peer.sendTransport.produce({ track: audioTrack });
      peer.producers.push(audioProducer);
    }

    console.log('DONE');
    startRecord();
  };

  const handleSendTransportListeners = async () => {
    peer.sendTransport.on('connect', handleTransportConnectEvent);
    peer.sendTransport.on('produce', handleTransportProduceEvent);
  };

  const handleTransportConnectEvent = ({ dtlsParameters }, callback, errback) => {
    console.log('handleTransportConnectEvent()');
    try {
      const action = (jsonMessage) => {
        console.log('connect-transport action');
        callback();
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

        console.log('video', peer.hasAudio());
        if (peer.hasVideo() && peer.hasAudio()) {
          console.log('audio video got');
        }
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

  const startRecord = async () => {
    console.log('startRecord()');
  };

  socket.addEventListener('open', handleSocketOpen);
  socket.addEventListener('message', handleSocketMessage);
  socket.addEventListener('error', handleSocketError);
  socket.addEventListener('close', handleSocketClose);
};

