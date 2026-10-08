const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PRODUCTS_DIR = path.join(DATA_DIR, 'products');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

async function initDirs() {
  await fs.mkdir(PRODUCTS_DIR, { recursive: true });
  try {
    await fs.access(INDEX_FILE);
  } catch {
    await fs.writeFile(INDEX_FILE, JSON.stringify({}, null, 2));
  }
}

/**
 * Чтение индекса.
 * Новый формат: { "<id>": { id, name, category, price, file }, ... }
 * Старый (массив) автоматически конвертируется в объект.
 */
async function readIndex() {
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf-8');
    const data = JSON.parse(raw);

    // Совместимость: если это массив (старый формат) — конвертируем в объект
    if (Array.isArray(data)) {
      const obj = {};
      data.forEach(item => { obj[item.id] = item; });
      return obj;
    }
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw new Error(`Ошибка чтения индекса: ${err.message}`);
  }
}

async function writeIndex(index) {
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
}

// ========== CREATE ==========
async function createProduct(name, category, price, quantity) {
  await initDirs();

  if (!name || !category || isNaN(price) || isNaN(quantity)) {
    throw new Error('Недостаточно аргументов: нужно название, категория, цена, количество');
  }

  const index = await readIndex();
  const id = String(Date.now());
  const fileName = `${id}.json`;
  const filePath = path.join(PRODUCTS_DIR, fileName);

  try {
    await fs.access(filePath);
    throw new Error(`Файл ${fileName} уже существует`);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const product = {
    id,
    name,
    category,
    price: parseFloat(price),
    quantity: parseInt(quantity, 10),
    createdAt: new Date().toISOString()
  };

  await fs.writeFile(filePath, JSON.stringify(product, null, 2));

  // Объект-индекс: index[id] = record
  index[id] = { id, name, category, price: product.price, file: fileName };
  await writeIndex(index);

  return product;
}

// ========== READ ==========
async function readProduct(id) {
  await initDirs();
  const index = await readIndex();
  const record = index[id];

  if (!record) {
    throw new Error(`Товар с id=${id} не найден в индексе`);
  }

  const filePath = path.join(PRODUCTS_DIR, record.file);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`Файл ${record.file} содержит некорректный JSON`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Файл ${record.file} не найден на диске`);
    }
    throw err;
  }
}

// ========== LIST ==========
/**
 * Возвращает массив записей из индекса.
 * @param {Object} options — { category, sortBy }
 *   - category: фильтр по категории
 *   - sortBy: 'name' | 'price' | 'category' | null
 */
async function listProducts(options = {}) {
  await initDirs();
  const index = await readIndex();
  let list = Object.values(index);

  // Фильтрация по категории
  if (options.category) {
    list = list.filter(item => item.category === options.category);
  }

  // Сортировка
  if (options.sortBy === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (options.sortBy === 'price') {
    list.sort((a, b) => a.price - b.price);
  } else if (options.sortBy === 'category') {
    list.sort((a, b) => a.category.localeCompare(b.category));
  }

  return list;
}

// ========== UPDATE ==========
async function updateProduct(id, field, value) {
  await initDirs();
  const product = await readProduct(id);

  if (!(field in product)) {
    throw new Error(`Поле "${field}" не существует у товара`);
  }

  product[field] = isNaN(value) ? value : Number(value);

  const filePath = path.join(PRODUCTS_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(product, null, 2));

  if (['name', 'category', 'price'].includes(field)) {
    const index = await readIndex();
    if (index[id]) index[id][field] = product[field];
    await writeIndex(index);
  }

  return product;
}

// ========== DELETE ==========
async function deleteProduct(id) {
  await initDirs();
  const index = await readIndex();
  const record = index[id];

  if (!record) {
    throw new Error(`Товар с id=${id} не найден`);
  }

  const filePath = path.join(PRODUCTS_DIR, record.file);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  delete index[id];
  await writeIndex(index);

  return record;
}

// ========== RENAME ==========
async function renameProductFile(id, newFileName) {
  await initDirs();
  const index = await readIndex();
  const record = index[id];

  if (!record) throw new Error(`Товар с id=${id} не найден`);

  const oldPath = path.join(PRODUCTS_DIR, record.file);
  const newPath = path.join(PRODUCTS_DIR, newFileName);

  try {
    await fs.access(newPath);
    throw new Error(`Файл ${newFileName} уже существует`);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  await fs.rename(oldPath, newPath);
  record.file = newFileName;
  await writeIndex(index);

  return record;
}

// ========== ЭКСПОРТ В CSV (новое) ==========
async function exportToCSV(outputFile) {
  const list = await listProducts();

  if (list.length === 0) {
    throw new Error('Нечего экспортировать: список пуст');
  }

  const escape = (val) => {
    const str = String(val ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = 'id,name,category,price';
  const rows = list.map(p => [p.id, p.name, p.category, p.price].map(escape).join(','));
  const csv = [header, ...rows].join('\n');

  const absolute = path.resolve(outputFile);
  await fs.writeFile(absolute, '\uFEFF' + csv, 'utf-8');

  return { count: list.length, path: absolute };
}

// ========== СТАТИСТИКА ПО КАТЕГОРИЯМ (новое) ==========
async function statsByCategory() {
  const list = await listProducts();

  if (list.length === 0) {
    throw new Error('Нет данных для статистики');
  }

  const byCategory = {};
  for (const item of list) {
    const cat = item.category || 'unknown';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, totalPrice: 0 };
    }
    byCategory[cat].count++;
    byCategory[cat].totalPrice += item.price || 0;
  }

  const result = {};
  for (const [cat, data] of Object.entries(byCategory)) {
    result[cat] = {
      count: data.count,
      avgPrice: Number((data.totalPrice / data.count).toFixed(2)),
      totalPrice: Number(data.totalPrice.toFixed(2))
    };
  }

  return {
    totalProducts: list.length,
    totalCategories: Object.keys(byCategory).length,
    byCategory: result
  };
}

module.exports = {
  initDirs,
  createProduct,
  readProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  renameProductFile,
  exportToCSV,
  statsByCategory,
  readIndex,
  PRODUCTS_DIR,
  DATA_DIR
};