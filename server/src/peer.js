// Class to hold peer data

module.exports = class Peer {
  constructor (sessionId) {
    this.sessionId = sessionId;
    this.transports = [];
    this.producers = [];
    this.consumers = [];
    this.process = undefined;
    this.remotePorts = [];
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

  getProducersByKind (kind) {
    return this.producers.filter((producer => producer.kind === kind));
  }

  getConsumersByKind (kind) {
    return this.consumers.filter((consumer => consumer.kind === kind));
  }
}
