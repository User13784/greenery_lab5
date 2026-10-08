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
    await fs.writeFile(INDEX_FILE, JSON.stringify([], null, 2));
  }
}

async function readIndex() {
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw new Error(`Ошибка чтения индекса: ${err.message}`);
  }
}

async function writeIndex(index) {
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
}

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
  index.push({ id, name, category, price: product.price, file: fileName });
  await writeIndex(index);

  return product;
}

async function readProduct(id) {
  await initDirs();
  const index = await readIndex();
  const record = index.find(item => item.id === id);

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

async function listProducts() {
  await initDirs();
  return readIndex();
}

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
    const record = index.find(item => item.id === id);
    if (record) record[field] = product[field];
    await writeIndex(index);
  }

  return product;
}

async function deleteProduct(id) {
  await initDirs();
  const index = await readIndex();
  const record = index.find(item => item.id === id);

  if (!record) {
    throw new Error(`Товар с id=${id} не найден`);
  }

  const filePath = path.join(PRODUCTS_DIR, record.file);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const newIndex = index.filter(item => item.id !== id);
  await writeIndex(newIndex);

  return record;
}

async function renameProductFile(id, newFileName) {
  await initDirs();
  const index = await readIndex();
  const record = index.find(item => item.id === id);

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

module.exports = {
  initDirs,
  createProduct,
  readProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  renameProductFile,
  readIndex,
  PRODUCTS_DIR,
  DATA_DIR
};