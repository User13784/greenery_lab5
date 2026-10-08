console.log('1 — синхронный (start)');

setTimeout(() => console.log('2 — setTimeout 0'), 0);

Promise.resolve().then(() => console.log('3 — Promise.then'));

process.nextTick(() => console.log('4 — process.nextTick'));

setImmediate(() => console.log('5 — setImmediate'));

console.log('6 — синхронный (end)');