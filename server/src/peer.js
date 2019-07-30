module.exports = class Peer {
  constructor (sessionId) {
    this.sessionId = sessionId;
    this.transports = [];
    this.producers = [];
  }

  addTransport (transport) {
    this.transports.push(transport);
  }

  getTransport (transportId) {
    return this.transports.find((transport => transport.id === transportId));
  }

  addProducer (producer) {
    this.producers.push(producer);
  }

  getProducer (producerId) {
    return this.producers.find((producer => producer.id === producerId));
  }
}
