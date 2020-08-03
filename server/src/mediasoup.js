const mediasoup = require('mediasoup');

const config = require('./config');

console.log('mediasoup loaded [version:%s]', mediasoup.version);

let workers = [];
let nextWorkerIndex = 0;

// Start the mediasoup workers
module.exports.initializeWorkers = async () => {
  const { logLevel, logTags, rtcMinPort, rtcMaxPort } = config.worker;

  console.log('initializeWorkers() creating %d mediasoup workers', config.numWorkers);

  for (let i = 0; i < config.numWorkers; ++i) {
    const worker = await mediasoup.createWorker({
      logLevel, logTags, rtcMinPort, rtcMaxPort
    });

    worker.once('died', () => {
      console.error('worker::died worker has died exiting in 2 seconds... [pid:%d]', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }
};

module.exports.createRouter = async () => {
  const worker = getNextWorker();

  console.log('createRouter() creating new router [worker.pid:%d]', worker.pid);

  console.log(`config.router.mediaCodecs:${JSON.stringify(config.router.mediaCodecs)}`)

  return await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
};

module.exports.createTransport = async (transportType, router, options) => {
  console.log('createTransport() [type:%s. options:%o]', transportType, options);

  switch (transportType) {
    case 'webRtc':
      return await router.createWebRtcTransport(config.webRtcTransport);
    case 'plain':
      return await router.createPlainRtpTransport(config.plainRtpTransport);
  }
};

const getNextWorker = () => {
  const worker = workers[nextWorkerIndex];

  if (++nextWorkerIndex === workers.length) {
    nextWorkerIndex = 0;
  }

  return worker;
};
