const fs = require('fs');
const path = require('path');

function readWithStream(filePath, onChunk, onEnd, onError) {
  const absolute = path.resolve(filePath);
  const stream = fs.createReadStream(absolute, { encoding: 'utf-8', highWaterMark: 64 * 1024 });

  let totalBytes = 0;
  let chunkCount = 0;

  stream.on('data', chunk => {
    totalBytes += Buffer.byteLength(chunk, 'utf-8');
    chunkCount++;
    if (onChunk) onChunk(chunk, chunkCount);
  });

  stream.on('end', () => {
    if (onEnd) onEnd({ totalBytes, chunkCount });
  });

  stream.on('error', err => {
    if (onError) onError(err);
  });

  return stream;
}

async function readFull(filePath) {
  const fsPromises = require('fs').promises;
  return fsPromises.readFile(path.resolve(filePath), 'utf-8');
}

module.exports = { readWithStream, readFull };