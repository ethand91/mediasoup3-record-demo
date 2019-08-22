// Port used for the gstreamer process to receive RTP from mediasoup 

const MIN_PORT = 20000;
const MAX_PORT = 30000;
const TIMEOUT = 400;

const takenPortSet = new Set();

module.exports.getPort = async () => {
  let port = getRandomPort();

  while(takenPortSet.has(port)) {
    port = getRandomPort();

    try {
      // Check that the port is available to use
      await isPortOpen(port);
    } catch (error) {
      console.error('getPort() port is taken [port:%d]', port);
      takenPortSet.add(port);
    }
  }

  takenPortSet.add(port);

  return port;
};

module.exports.releasePort = (port) => takenPortSet.delete(port);

const getRandomPort = () => Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1) + MIN_PORT); 

// Users a socket to check that the port is open
const isPortOpen = (port) => {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve); 
    
    socket.setTimeout(TIMEOUT);
    socket.once('timeout', () => reject);
    socket.once('error', (error) => reject());

    socket.connect(port, '127.0.0.1');
  });
};
