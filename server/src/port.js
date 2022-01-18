// Port used for the gstreamer process to receive RTP from mediasoup 

const MIN_PORT = 20000;
const MAX_PORT = 30000;
const TIMEOUT = 400;

const takenPortSet = new Set();

module.exports.getPort = async () => {
  let port = getRandomPort();

  while(takenPortSet.has(port)) {
    port = getRandomPort();
  }

  takenPortSet.add(port);

  return port;
};

module.exports.releasePort = (port) => takenPortSet.delete(port);

const getRandomPort = () => Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1) + MIN_PORT); 
