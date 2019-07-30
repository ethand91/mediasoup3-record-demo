const mediasoup = require('mediasoup-client');

console.log(mediasoup);
console.log('using mediasoup-client version %s', mediasoup.version);

module.exports.createDevice = async (routerRtpCapabilities) => {
  try {
    const device = new mediasoup.Device();
    await device.load({ routerRtpCapabilities });
    console.log('mediasoup device loaded [rtpCapabilities:%o]', device.rtpCapabilities);
    console.log('[canProduceVideo:%o, canProduceAudio:%o]', device.canProduce('video'), device.canProduce('audio'));
    
    return device;
  } catch (error) {
    console.log('failed to create mediasoup device [error:%o]', error);
    throw error;
  }
};

module.exports.createSendTransport = async (device, transportOptions, connect) => {
  console.log('createSendTransport() [transportOptions:%o]', transportOptions);
  const sendTransport = await device.createSendTransport(transportOptions);
  console.log('created mediasoup send transport [id:%s]', sendTransport.id);

  return sendTransport;
};

module.exports.produce = async (mediaTrack, device, sendTransport, producerOptions) => {
  console.log('produce() [trackKind:%s, producerOptions:%o]', mediaTrack.kind, producerOptions);

  if (!device.canProduce(mediaTrack.kind)) {
    throw new Error(`device cannot produce media track of kind: ${mediaTrack.kind}`);
  }

  const producer = await sendTransport.produce(producerOptions);
  console.log('produce() producer created [id:%s, kind:%s]', producer.id, producer.kind);

  return producer;
};
