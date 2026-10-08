const readline = require('readline');
const { listProducts } = require('../fs/fileManager');

async function interactiveSearch() {
  const products = await listProducts();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🔍 Интерактивный поиск (регистронезависимый). Введите "exit" для выхода.\n');

  const ask = () => {
    rl.question('Введите запрос: ', query => {
      if (query.toLowerCase().trim() === 'exit') {
        rl.close();
        return;
      }

      const lower = query.toLowerCase().trim();
      const words = lower.split(/\s+/).filter(Boolean);

      const results = products.filter(p => {
        const haystack = `${p.name || ''} ${p.category || ''}`.toLowerCase();
        return words.every(w => haystack.includes(w));
      });

      if (results.length === 0) {
        console.log('  ❌ Ничего не найдено\n');
      } else {
        console.log(`  ✅ Найдено: ${results.length}`);
        results.forEach(r => {
          console.log(`     [${r.id}] ${r.name} — ${r.category} — £${r.price}`);
        });
        console.log();
      }

      ask();
    });
  };

  ask();
}

module.exports = { interactiveSearch };