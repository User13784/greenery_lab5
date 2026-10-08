const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

class ProductTransform extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: false });
    this.buffer = '';
    this.count = 0;
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString('utf-8');
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        obj._processedAt = new Date().toISOString();
        obj._lineNumber = ++this.count;
        this.push(JSON.stringify(obj) + '\n');
      } catch {}
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.trim()) {
      try {
        const obj = JSON.parse(this.buffer.trim());
        obj._processedAt = new Date().toISOString();
        obj._lineNumber = ++this.count;
        this.push(JSON.stringify(obj) + '\n');
      } catch {}
    }
    callback();
  }
}

function transformFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(path.resolve(inputPath), { encoding: 'utf-8' });
    const output = fs.createWriteStream(path.resolve(outputPath), { encoding: 'utf-8' });
    const transformer = new ProductTransform();

    input
      .pipe(transformer)
      .pipe(output)
      .on('finish', () => resolve({ ok: true }))
      .on('error', reject);

    input.on('error', reject);
    output.on('error', reject);
  });
}

module.exports = { transformFile, ProductTransform };