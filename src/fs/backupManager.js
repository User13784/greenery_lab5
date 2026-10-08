const fs = require('fs').promises;
const path = require('path');

async function copyDirectory(src, dest) {
  const srcPath = path.resolve(src);
  const destPath = path.resolve(dest);

  try {
    await fs.access(srcPath);
  } catch {
    throw new Error(`Источник "${src}" не существует`);
  }

  try {
    await fs.mkdir(destPath, { recursive: true });
  } catch (err) {
    throw new Error(`Не удалось создать каталог "${dest}": ${err.message}`);
  }

  const entries = await fs.readdir(srcPath, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const srcFile = path.join(srcPath, entry.name);
    const destFile = path.join(destPath, entry.name);

    if (entry.isDirectory()) {
      count += await copyDirectory(srcFile, destFile);
    } else {
      await fs.copyFile(srcFile, destFile);
      count++;
    }
  }

  return count;
}

async function createBackup(src, dest) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(dest, `backup-${timestamp}`);

  const count = await copyDirectory(src, backupDir);
  return { backupDir, count };
}

module.exports = { createBackup, copyDirectory };