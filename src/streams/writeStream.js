const fs = require('fs');
const path = require('path');

function writeWithStream(filePath, chunks) {
  return new Promise((resolve, reject) => {
    const absolute = path.resolve(filePath);
    const stream = fs.createWriteStream(absolute, { encoding: 'utf-8' });

    stream.on('error', reject);
    stream.on('finish', resolve);

    for (const chunk of chunks) {
      stream.write(chunk);
    }
    stream.end();
  });
}

module.exports = { writeWithStream };