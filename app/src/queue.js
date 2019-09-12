// Queue to handle async requests/responses
module.exports = class SocketQueue {
  constructor () {
    this.queue = new Map();
  }

  push (action, callback) {
    this.queue.set(action, callback);
  }

  get (action) {
    return this.queue.get(action);
  }

  remove (action) {
    this.queue.delete(action);
  }
}
