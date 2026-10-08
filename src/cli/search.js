const readline = require('readline');
const { listProducts } = require('../fs/fileManager');

async function interactiveSearch() {
  const products = await listProducts();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🔍 Интерактивный поиск. Введите "exit" для выхода.\n');

  const ask = () => {
    rl.question('Введите запрос: ', query => {
      if (query.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      const lower = query.toLowerCase();
      const results = products.filter(p =>
        (p.name || '').toLowerCase().includes(lower) ||
        (p.category || '').toLowerCase().includes(lower)
      );

      if (results.length === 0) {
        console.log('  ❌ Ничего не найдено\n');
      } else {
        console.log(`  ✅ Найдено: ${results.length}`);
        results.forEach(r => console.log(`     [${r.id}] ${r.name} — ${r.category} — £${r.price}`));
        console.log();
      }

      ask();
    });
  };

  ask();
}

module.exports = { interactiveSearch };