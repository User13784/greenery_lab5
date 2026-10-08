const {
  createProduct,
  readProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  renameProductFile,
  exportToCSV,
  statsByCategory,
  PRODUCTS_DIR
} = require('../fs/fileManager');
const { createBackup, restoreFromBackup } = require('../fs/backupManager');
const { readWithStream, readFull } = require('../streams/readStream');
const { transformFile } = require('../streams/transformStream');
const { runStatsWorker, computeStatsMainThread } = require('../workers/workerRunner');
const { interactiveSearch } = require('./search');
const path = require('path');
const fs = require('fs');

/**
 * Разбор параметров команды list:
 *   node app.js list
 *   node app.js list sofa
 *   node app.js list --sort=name
 *   node app.js list sofa --sort=price
 */
function parseListParams(params) {
  const options = { category: null, sortBy: null };
  for (const p of params) {
    if (p.startsWith('--sort=')) {
      const val = p.slice('--sort='.length);
      if (!['name', 'price', 'category'].includes(val)) {
        throw new Error(`Неизвестный ключ сортировки: "${val}". Доступно: name, price, category`);
      }
      options.sortBy = val;
    } else if (!p.startsWith('--')) {
      options.category = p;
    }
  }
  return options;
}

async function handleCommand(args) {
  const [command, ...params] = args;

  switch (command) {

    // ==================== CREATE ====================
    case 'create': {
      const [name, category, price, quantity] = params;
      const product = await createProduct(name, category, price, quantity);
      console.log('✅ Товар создан:');
      console.log(JSON.stringify(product, null, 2));
      break;
    }

    // ==================== READ ====================
    case 'read': {
      const [id] = params;
      if (!id) throw new Error('Укажите id товара');
      const product = await readProduct(id);
      console.log('📦 Товар:');
      console.log(JSON.stringify(product, null, 2));
      break;
    }

    // ==================== LIST (с фильтром и сортировкой) ====================
    case 'list': {
      const options = parseListParams(params);
      const list = await listProducts(options);

      if (list.length === 0) {
        if (options.category) {
          console.log(`📭 В категории "${options.category}" товаров нет`);
        } else {
          console.log('📭 Список пуст');
        }
        break;
      }

      const title = [];
      if (options.category) title.push(`категория: "${options.category}"`);
      if (options.sortBy) title.push(`сортировка по: ${options.sortBy}`);
      const suffix = title.length ? ` (${title.join(', ')})` : '';

      console.log(`📋 Всего товаров: ${list.length}${suffix}\n`);
      list.forEach(item => {
        console.log(`  [${item.id}] ${item.name} — ${item.category} — £${item.price}`);
      });
      break;
    }

    // ==================== UPDATE ====================
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

    // ==================== DELETE ====================
    case 'delete': {
      const [id] = params;
      if (!id) throw new Error('Укажите id товара');
      const deleted = await deleteProduct(id);
      console.log(`🗑️ Удалён товар: [${deleted.id}] ${deleted.name}`);
      break;
    }

    // ==================== RENAME ====================
    case 'rename': {
      const [id, newName] = params;
      if (!id || !newName) throw new Error('Использование: rename <id> <новоеИмяФайла>');
      const record = await renameProductFile(id, newName);
      console.log(`✅ Файл переименован: ${record.file}`);
      break;
    }

    // ==================== BACKUP ====================
    case 'backup': {
      const [src, dest] = params;
      if (!src || !dest) throw new Error('Использование: backup <источник> <назначение>');
      const { backupDir, count } = await createBackup(src, dest);
      console.log(`✅ Резервная копия создана: ${backupDir}`);
      console.log(`📁 Скопировано файлов: ${count}`);
      break;
    }

    // ==================== RESTORE (новое) ====================
    case 'restore': {
      const [backupDir, targetDir] = params;
      if (!backupDir || !targetDir) {
        throw new Error('Использование: restore <папка-бэкапа> <целевая-папка>');
      }
      const { targetDir: restored, count } = await restoreFromBackup(backupDir, targetDir);
      console.log(`✅ Восстановлено ${count} файлов в ${restored}`);
      break;
    }

    // ==================== EXPORT (новое) ====================
    case 'export': {
      const [outputFile] = params;
      if (!outputFile) throw new Error('Использование: export <файл.csv>');
      const { count, path: filePath } = await exportToCSV(outputFile);
      console.log(`✅ Экспортировано ${count} товаров в ${filePath}`);
      break;
    }

    // ==================== SEARCH ====================
    case 'search': {
      await interactiveSearch();
      break;
    }

    // ==================== STATS (Worker) ====================
    case 'stats': {
      console.log('⏳ Подсчёт статистики в Worker Thread...');
      const t0 = Date.now();
      const stats = await runStatsWorker(PRODUCTS_DIR);
      const t1 = Date.now();
      console.log(`✅ Готово за ${t1 - t0} мс`);
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    // ==================== STATS-MAIN ====================
    case 'stats-main': {
      console.log('⏳ Подсчёт статистики в основном потоке...');
      const t0 = Date.now();
      const stats = computeStatsMainThread(PRODUCTS_DIR);
      const t1 = Date.now();
      console.log(`✅ Готово за ${t1 - t0} мс`);
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    // ==================== STATS-BY-CATEGORY (новое) ====================
    case 'stats-by-category': {
      const stats = await statsByCategory();
      console.log('📊 Статистика по категориям:\n');
      console.log(`Всего товаров: ${stats.totalProducts}`);
      console.log(`Категорий: ${stats.totalCategories}\n`);
      for (const [cat, data] of Object.entries(stats.byCategory)) {
        console.log(`  ${cat}:`);
        console.log(`    Количество: ${data.count}`);
        console.log(`    Средняя цена: £${data.avgPrice}`);
        console.log(`    Общая стоимость: £${data.totalPrice}`);
        console.log();
      }
      break;
    }

    // ==================== STREAM-READ ====================
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

    // ==================== STREAM-TRANSFORM ====================
    case 'stream-transform': {
      const [input, output] = params;
      if (!input || !output) throw new Error('Использование: stream-transform <вход> <выход>');
      await transformFile(input, output);
      console.log(`✅ Файл обработан: ${output}`);
      break;
    }

    // ==================== GENERATE-BIG ====================
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