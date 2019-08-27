const { Readable } = require('stream');

// Converts a string (SDP) to a stream so it can be piped into the FFmpeg process
module.exports.convertStringToStream = (stringToConvert) => {
  const stream = new Readable();
  stream._read = () => {};
  stream.push(stringToConvert);
  stream.push(null);

  return stream;
};
