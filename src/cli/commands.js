const {
  createProduct,
  readProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  renameProductFile,
  PRODUCTS_DIR
} = require('../fs/fileManager');
const { createBackup } = require('../fs/backupManager');
const { readWithStream, readFull } = require('../streams/readStream');
const { transformFile } = require('../streams/transformStream');
const { runStatsWorker, computeStatsMainThread } = require('../workers/workerRunner');
const { interactiveSearch } = require('./search');
const path = require('path');
const fs = require('fs');

async function handleCommand(args) {
  const [command, ...params] = args;

  switch (command) {
    case 'create': {
      const [name, category, price, quantity] = params;
      const product = await createProduct(name, category, price, quantity);
      console.log('✅ Товар создан:');
      console.log(JSON.stringify(product, null, 2));
      break;
    }

    case 'read': {
      const [id] = params;
      if (!id) throw new Error('Укажите id товара');
      const product = await readProduct(id);
      console.log('📦 Товар:');
      console.log(JSON.stringify(product, null, 2));
      break;
    }

    case 'list': {
      const list = await listProducts();
      if (list.length === 0) {
        console.log('📭 Список пуст');
      } else {
        console.log(`📋 Всего товаров: ${list.length}\n`);
        list.forEach(item => {
          console.log(`  [${item.id}] ${item.name} — ${item.category} — £${item.price}`);
        });
      }
      break;
    }

    case 'update': {
      const [id, field, value] = params;
      if (!id || !field || value === undefined) {
        throw new Error('Использование: update <id> <поле> <значение>');
      }
      const updated = await updateProduct(id, field, value);
      console.log('✅ Обновлено:');
      console.log(JSON.stringify(updated, null, 2));
      break;
    }

    case 'delete': {
      const [id] = params;
      if (!id) throw new Error('Укажите id товара');
      const deleted = await deleteProduct(id);
      console.log(`🗑️ Удалён товар: [${deleted.id}] ${deleted.name}`);
      break;
    }

    case 'rename': {
      const [id, newName] = params;
      if (!id || !newName) throw new Error('Использование: rename <id> <новоеИмяФайла>');
      const record = await renameProductFile(id, newName);
      console.log(`✅ Файл переименован: ${record.file}`);
      break;
    }

    case 'backup': {
      const [src, dest] = params;
      if (!src || !dest) throw new Error('Использование: backup <источник> <назначение>');
      const { backupDir, count } = await createBackup(src, dest);
      console.log(`✅ Резервная копия создана: ${backupDir}`);
      console.log(`📁 Скопировано файлов: ${count}`);
      break;
    }

    case 'search': {
      await interactiveSearch();
      break;
    }

    case 'stats': {
      console.log('⏳ Подсчёт статистики в Worker Thread...');
      const t0 = Date.now();
      const stats = await runStatsWorker(PRODUCTS_DIR);
      const t1 = Date.now();
      console.log(`✅ Готово за ${t1 - t0} мс`);
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case 'stats-main': {
      console.log('⏳ Подсчёт статистики в основном потоке...');
      const t0 = Date.now();
      const stats = computeStatsMainThread(PRODUCTS_DIR);
      const t1 = Date.now();
      console.log(`✅ Готово за ${t1 - t0} мс`);
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case 'stream-read': {
      const [file] = params;
      if (!file) throw new Error('Укажите файл');

      const fullPath = path.resolve(file);

      console.log('📖 Полное чтение (readFile)...');
      const t0 = Date.now();
      const fullData = await readFull(fullPath);
      const t1 = Date.now();
      console.log(`   Размер: ${(Buffer.byteLength(fullData) / 1024).toFixed(2)} КБ, время: ${t1 - t0} мс\n`);

      console.log('🌊 Потоковое чтение (createReadStream)...');
      const t2 = Date.now();
      await new Promise((resolve, reject) => {
        readWithStream(
          fullPath,
          null,
          info => {
            const t3 = Date.now();
            console.log(`   Чанков: ${info.chunkCount}, байт: ${info.totalBytes}, время: ${t3 - t2} мс`);
            resolve();
          },
          reject
        );
      });
      break;
    }

    case 'stream-transform': {
      const [input, output] = params;
      if (!input || !output) throw new Error('Использование: stream-transform <вход> <выход>');
      await transformFile(input, output);
      console.log(`✅ Файл обработан: ${output}`);
      break;
    }

    case 'generate-big': {
      const [countStr] = params;
      const count = parseInt(countStr, 10) || 100000;
      const outPath = path.join(__dirname, '..', '..', 'data', 'big-data.jsonl');

      console.log(`⏳ Генерация ${count} записей в ${outPath}...`);
      const stream = fs.createWriteStream(outPath);

      for (let i = 0; i < count; i++) {
        const obj = {
          id: i + 1,
          name: `Товар #${i + 1}`,
          category: ['sofa', 'living', 'kitchen', 'bedroom', 'bathroom', 'decor'][i % 6],
          price: Math.round(Math.random() * 2000 * 100) / 100,
          quantity: Math.floor(Math.random() * 100)
        };
        stream.write(JSON.stringify(obj) + '\n');
      }

      stream.end();
      await new Promise(resolve => stream.on('finish', resolve));
      console.log('✅ Готово');
      break;
    }

    default:
      throw new Error(`Неизвестная команда: "${command}"`);
  }
}

module.exports = { handleCommand };