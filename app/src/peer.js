// Class to hold peers info
module.exports = class Peer {
  constructor (sessionId, device) {
    this.sessionId = sessionId;
    this.device = device;
    this.producers = [];

    this.mediaStream = new MediaStream();
    this.sendTransport = undefined;
  }

  hasVideo () {
    return Boolean(this.producers.find((producer => producer.kind === 'video')));
  }

  hasAudio () {
    return Boolean(this.producers.find((producer => producer.kind === 'audio')));
  }
}
