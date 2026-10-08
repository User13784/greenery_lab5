const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

function computeStats(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let totalPrice = 0;
  let totalQuantity = 0;
  let maxPrice = -Infinity;
  let minPrice = Infinity;
  const byCategory = {};
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const product = JSON.parse(raw);

      totalPrice += product.price || 0;
      totalQuantity += product.quantity || 0;
      maxPrice = Math.max(maxPrice, product.price || 0);
      minPrice = Math.min(minPrice, product.price || 0);

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
    maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    byCategory
  };
}

const result = computeStats(workerData.dir);
parentPort.postMessage(result);