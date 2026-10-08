#!/usr/bin/env node
const { handleCommand } = require('./src/cli/commands');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🌿 Greenery CLI — управление товарами магазина мебели

Использование:
  node app.js create "<название>" "<категория>" <цена> <количество>
  node app.js read <id>
  node app.js list [категория]              # + фильтр по категории
  node app.js list --sort=name              # + сортировка
  node app.js list --sort=price
  node app.js update <id> <поле> <значение>
  node app.js delete <id>
  node app.js search
  node app.js backup <источник> <назначение>
  node app.js restore <бэкап> <целевая>     # + восстановление
  node app.js rename <id> <новоеИмяФайла>
  node app.js export <файл.csv>             # + экспорт в CSV
  node app.js stats
  node app.js stats-main
  node app.js stats-by-category             # + статистика по категориям
  node app.js generate-big <количество>
  node app.js stream-read <файл>
  node app.js stream-transform <вход> <выход>
  `);
  process.exit(0);
}

handleCommand(args).catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});