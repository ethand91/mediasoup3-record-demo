const MIN_PORT = 20000;
const MAX_PORT = 30000;
const TIMEOUT = 400;

const takenPortSet = new Set();

module.exports.getPort = async () => {
  let port = getRandomPort();

  while(takenPortSet.has(port)) {
    port = getRandomPort();
  }

  // TODO: check if port is open

  takenPortSet.add(port);

  console.log('getPort() [port:%d]', port);

  return port;
};

module.exports.releasePort = (port) => takenPortSet.delete(port);

const getRandomPort = () => Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1) + MIN_PORT); 

const isPortOpen = (port) => {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve); 
    
    socket.setTimeout(TIMEOUT);
    socket.once('timeout', () => reject);
    socket.once('error', (error) => {
      console.error('socket failed to bind [error:%o]', error);
      return reject();
    });

    socket.connect(port, '127.0.0.1');
  });
};
