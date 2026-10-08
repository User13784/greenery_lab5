const { Worker } = require('worker_threads');
const path = require('path');

function runStatsWorker(dir) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'statsWorker.js'), {
      workerData: { dir }
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', code => {
      if (code !== 0) reject(new Error(`Worker завершился с кодом ${code}`));
    });
  });
}

function computeStatsMainThread(dir) {
  const fs = require('fs');
  const path = require('path');

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let totalPrice = 0;
  let totalQuantity = 0;
  let processed = 0;
  const byCategory = {};

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const product = JSON.parse(raw);
      totalPrice += product.price || 0;
      totalQuantity += product.quantity || 0;
      const cat = product.category || 'unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      processed++;

      for (let i = 0; i < 100000; i++) Math.sqrt(i);
    } catch {}
  }

  return {
    totalProducts: processed,
    totalPrice: Number(totalPrice.toFixed(2)),
    totalQuantity,
    avgPrice: processed ? Number((totalPrice / processed).toFixed(2)) : 0,
    byCategory
  };
}

module.exports = { runStatsWorker, computeStatsMainThread };