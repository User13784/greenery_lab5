# 🌿 Greenery CLI

Консольное приложение для управления товарами магазина мебели **Greenery**.

**Предметная область:** интернет-магазин мебели (товары, категории, цены, остатки).

**Лабораторная работа №5** — Node.js: файловая система, CLI, потоки и Worker Threads.

---

## 📋 Содержание

- [Установка и запуск](#-установка-и-запуск)
- [Команды CLI](#-команды-cli)
- [Структура проекта](#-структура-проекта)
- [Схема движения данных](#-схема-движения-данных)
- [Ответы на вопросы](#-ответы-на-вопросы)
  - [1. process.argv](#1-что-хранится-в-processargv-и-почему-значения-из-него-имеют-тип-string)
  - [2. argv vs stdin](#2-чем-аргументы-командной-строки-отличаются-от-данных-введённых-через-stdin)
  - [3. Недостаточно аргументов](#3-что-должна-делать-программа-если-пользователь-передал-недостаточное-количество-аргументов)
  - [4. Event Loop](#4-асинхронность-и-event-loop)
  - [5. Stream vs readFile](#5-потоки-stream-vs-readfile)
  - [6. Worker Thread](#6-worker-thread-vs-child_processspawn)
- [Обработанные ошибки](#-обработанные-ошибки)
- [Индивидуальное мини-задание](#-индивидуальное-мини-задание)
- [Использованные модули](#-использованные-модули-nodejs)

---

## 🚀 Установка и запуск

Зависимостей нет — используются только **встроенные модули Node.js**.

**Требуется Node.js ≥ 18.**

```bash
# Клонировать репозиторий
git clone https://github.com/User13784/greenery_lab5.git
cd greenery_lab5

# Запустить справку
node app.js
```

---

## 💻 Команды CLI

```bash
# Справка
node app.js

# Создать товар
node app.js create "Диван" "sofa" 899 10

# Прочитать товар по id
node app.js read <id>

# Список всех товаров
node app.js list

# Обновить поле товара
node app.js update <id> price 999

# Удалить товар
node app.js delete <id>

# Переименовать файл товара
node app.js rename <id> new-name.json

# Интерактивный поиск (stdin)
node app.js search

# Резервная копия каталога
node app.js backup ./data ./backup

# Статистика через Worker Thread
node app.js stats

# Статистика в основном потоке (для сравнения)
node app.js stats-main

# Сгенерировать большой файл (для экспериментов со Stream)
node app.js generate-big 100000

# Сравнить readFile и createReadStream
node app.js stream-read data/big-data.jsonl

# Обработать файл через Transform Stream
node app.js stream-transform data/big-data.jsonl data/transformed.jsonl
```

---

## 🗂️ Структура проекта

```
lab5/
├── app.js                      # Точка входа CLI (process.argv)
├── package.json
├── README.md
├── .gitignore
├── data/                       # Данные приложения
│   ├── index.json              # Индексный файл
│   ├── products/               # JSON-файлы товаров
│   │   └── <id>.json
│   └── big-data.jsonl          # Большой файл для Stream
├── backup/                     # Резервные копии
├── experiments/
│   └── event-loop.js           # Эксперимент Event Loop
└── src/
    ├── fs/                     # Файловая система
    │   ├── fileManager.js      # CRUD, индекс
    │   └── backupManager.js    # Backup, копирование
    ├── streams/                # Потоки
    │   ├── readStream.js       # Readable Stream
    │   ├── writeStream.js      # Writable Stream
    │   └── transformStream.js  # Transform Stream
    ├── workers/                # Worker Threads
    │   ├── statsWorker.js      # Тяжёлые вычисления
    │   └── workerRunner.js     # Запуск Worker
    └── cli/                    # CLI-логика
        ├── commands.js         # Обработка команд
        └── search.js           # Интерактивный поиск (readline)
```

**Обоснование структуры:**

- **Отдельный JSON на товар** — удобно читать/обновлять отдельную запись без парсинга всего файла.
- **Индексный файл `index.json`** — быстрый доступ к списку без чтения всех файлов.
- **Идентификатор = `Date.now()`** — гарантирует уникальность без внешней БД.
- **Разделение на `fs`, `streams`, `workers`** — модульность, каждый модуль отвечает за своё.

---

## 🔄 Схема движения данных

```
Пользователь
    │
    ▼
process.argv  ──►  app.js  ──►  handleCommand()
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
       fileManager.js         stream-модули         workerRunner.js
              │                     │                     │
              ▼                     ▼                     ▼
       data/products/         big-data.jsonl        statsWorker.js
       data/index.json        transformed.jsonl     (отдельный поток)
```

---

## ❓ Ответы на вопросы

### 1. Что хранится в process.argv и почему значения из него имеют тип string?

`process.argv` — массив аргументов командной строки, переданных при запуске Node.js.

**Состав:**

- `argv[0]` — путь к исполняемому файлу Node.js
- `argv[1]` — путь к запускаемому скрипту (`app.js`)
- `argv[2..]` — то, что ввёл пользователь

**Пример:**

```bash
node app.js create "Диван" sofa 899 10
```

```js
process.argv === [
  'C:\\Program Files\\nodejs\\node.exe',  // argv[0]
  'D:\\...\\lab5\\app.js',                // argv[1]
  'create',                                // argv[2]
  'Диван',                                 // argv[3]
  'sofa',                                  // argv[4]
  '899',                                   // argv[5]
  '10'                                     // argv[6]
]
```

**Почему все значения — строки?**
Командная строка — это текст. Операционная система передаёт аргументы как строки. Node.js не пытается угадывать типы (число `899` или строка `"899"`?). Поэтому преобразование делаем вручную:

```js
price: parseFloat(price)      // "899" → 899
quantity: parseInt(quantity)  // "10" → 10
```

В нашем коде это делается в `createProduct()` (`src/fs/fileManager.js`).

---

### 2. Чем аргументы командной строки отличаются от данных, введённых через stdin?

| Характеристика | `process.argv` | `stdin` |
|----------------|----------------|---------|
| Когда доступно | Сразу при запуске | Во время работы программы |
| Как передаётся | В командной строке | Потоком ввода |
| Пример | `node app.js create "Диван"` | `node app.js search` → ввод с клавиатуры |
| Модуль | — | `readline`, `process.stdin` |
| Тип данных | Массив строк | Поток (читается построчно) |
| Интерактивность | Нет | Да |

**Когда что использовать:**

- **argv** — для параметризованных команд (`create`, `read`, `delete`) — пользователь знает, что хочет.
- **stdin** — для интерактивного поиска (`search`), когда запрос неизвестен заранее и нужен диалог.

В нашем приложении:

- `create`, `read`, `update`, `delete`, `list`, `backup`, `rename` → `process.argv`
- `search` → `readline` + `process.stdin`

---

### 3. Что должна делать программа, если пользователь передал недостаточное количество аргументов?

Программа должна:

1. **Не падать** с непонятной ошибкой.
2. **Вывести понятное сообщение** — что именно не так.
3. **Показать справку** по использованию.
4. **Завершиться с кодом 1** (признак ошибки).

**Пример из `src/cli/commands.js`:**

```js
case 'create': {
  const [name, category, price, quantity] = params;
  const product = await createProduct(name, category, price, quantity);
  ...
}
```

Внутри `createProduct()`:

```js
if (!name || !category || isNaN(price) || isNaN(quantity)) {
  throw new Error('Недостаточно аргументов: нужно название, категория, цена, количество');
}
```

В `app.js` ошибка перехватывается:

```js
handleCommand(args).catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
```

**Пример работы:**

```bash
$ node app.js create "Диван"
❌ Ошибка: Недостаточно аргументов: нужно название, категория, цена, количество
```

Программа **не падает**, а показывает **понятное сообщение** и завершается с кодом 1.

---

### 4. Асинхронность и Event Loop

См. файл `experiments/event-loop.js`.

**Код:**

```js
console.log('1 — синхронный (start)');
setTimeout(() => console.log('2 — setTimeout 0'), 0);
Promise.resolve().then(() => console.log('3 — Promise.then'));
process.nextTick(() => console.log('4 — process.nextTick'));
setImmediate(() => console.log('5 — setImmediate'));
console.log('6 — синхронный (end)');
```

**Предсказание:** `1, 6, 4, 3, 2, 5`

**Фактический вывод:**

```
1 — синхронный (start)
6 — синхронный (end)
4 — process.nextTick
3 — Promise.then
2 — setTimeout 0
5 — setImmediate
```

**Объяснение простыми словами:**

1. **Синхронный код** выполняется первым — `1` и `6` выводятся сразу.
2. Когда стек опустел, Event Loop обрабатывает **микротаски**:
   - Сначала `process.nextTick` → `4`
   - Затем промисы → `3`
3. Только потом — **макротаски**:
   - Фаза **timers** → `setTimeout` → `2`
   - Фаза **check** → `setImmediate` → `5`

**Что откладывается:**

- `setTimeout(0)` — на следующую итерацию Event Loop (фаза timers)
- `setImmediate` — на фазу check (после poll)
- `Promise.then` — в очередь микротаск
- `process.nextTick` — в очередь nextTick (обрабатывается **до** промисов)

---

### 5. Потоки: Stream vs readFile

**Эксперимент:**

```bash
node app.js generate-big 100000       # создаёт ~10 МБ JSONL
node app.js stream-read data/big-data.jsonl
```

**Результаты (примерные):**

| Метод | Время | Память | Особенность |
|-------|-------|--------|-------------|
| `fs.readFile` | ~50 мс | ~10 МБ сразу | Весь файл в RAM |
| `createReadStream` | ~60 мс | ~64 КБ (chunk) | Обработка по частям |

На маленьких файлах разница незаметна. На **больших** (гигабайты) `readFile` может упасть с `JavaScript heap out of memory`, а Stream — нет.

**Что такое chunk?**
Chunk — порция данных, которую поток читает за раз. По умолчанию 64 КБ (`highWaterMark: 64 * 1024`). Читаем → обрабатываем → забываем → читаем следующий.

**Как связаны Readable, Transform, Writable?**

```
Readable ──► Transform ──► Writable
(источник)   (обработка)   (назначение)
```

- **Readable** — откуда читаем (файл, сокет).
- **Transform** — преобразует данные по пути.
- **Writable** — куда пишем (файл, сокет).

**Что делает `pipe()`?**
`pipe()` соединяет потоки: данные из Readable **автоматически** перетекают в Transform, потом в Writable. Управляет backpressure (если Writable не успевает — Readable притормаживает).

**Пример из `transformStream.js`:**

```js
input
  .pipe(transformer)
  .pipe(output);
```

Без `pipe()` пришлось бы вручную писать `input.on('data', ...)`, `output.write(...)`, следить за `drain` — куча кода.

**Почему Stream не грузит файл в память сразу?**
Поток читает файл **порциями**. Каждая порция обрабатывается и освобождается. Память занята только текущим chunk'ом.

---

### 6. Worker Thread vs child_process.spawn

| Характеристика | Worker Thread | child_process.spawn |
|----------------|---------------|---------------------|
| Что это | Поток внутри того же процесса | Отдельный процесс ОС |
| Память | Общая (можно `SharedArrayBuffer`) | Изолированная |
| Запуск | Быстро (~мс) | Медленно (~десятки мс) |
| Обмен данными | Через `postMessage` / shared memory | Через stdin/stdout/IPC |
| Когда использовать | CPU-задачи | Внешние программы (ffmpeg, git) |
| Падение | Может уронить весь процесс | Не влияет на родителя |

**Почему Worker Thread и async I/O решают разные задачи?**

- **async I/O** (`fs.promises.readFile`) — не блокирует Event Loop, но **не помогает**, если у нас **CPU-задача** (парсинг, хеширование, математика). Пока CPU занят — Event Loop стоит.
- **Worker Thread** — выносит CPU-задачу в **отдельный поток**. Основной Event Loop продолжает обрабатывать запросы.

**В нашем приложении:**

```bash
node app.js stats        # Worker Thread
node app.js stats-main   # Основной поток
```

`stats` считает статистику в отдельном потоке — основной поток свободен. `stats-main` блокирует Event Loop на всё время подсчёта.

**Наглядный эксперимент:**

Открыть **два терминала**.

**Терминал 1:**
```bash
node app.js stats
```

**Терминал 2 (пока идёт подсчёт):**
```bash
node app.js list
```
→ `list` **отвечает мгновенно**, потому что основной поток свободен.

**Терминал 1:**
```bash
node app.js stats-main
```

**Терминал 2 (пока идёт подсчёт):**
```bash
node app.js list
```
→ `list` **ждёт**, пока `stats-main` не закончит — Event Loop занят.

---

## 🐛 Обработанные ошибки

### 1. Чтение несуществующей записи

```bash
$ node app.js read 999999
❌ Ошибка: Товар с id=999999 не найден в индексе
```

### 2. Удаление несуществующей записи

```bash
$ node app.js delete 999999
❌ Ошибка: Товар с id=999999 не найден
```

### 3. Создание с дубликатом id

```bash
$ node app.js create "Диван" sofa 899 10
✅ Товар создан: ...

$ node app.js create "Диван2" sofa 999 5   # id = Date.now() совпал
❌ Ошибка: Файл <id>.json уже существует
```

### 4. Некорректные аргументы

```bash
$ node app.js create "Диван"
❌ Ошибка: Недостаточно аргументов: нужно название, категория, цена, количество

$ node app.js foobar
❌ Ошибка: Неизвестная команда: "foobar"

$ node app.js update
❌ Ошибка: Использование: update <id> <поле> <значение>
```

### 5. Повреждённый JSON

Если вручную испортить `data/products/<id>.json`:

```bash
$ node app.js read <id>
❌ Ошибка: Файл <id>.json содержит некорректный JSON
```

### 6. Backup в несуществующий каталог

```bash
$ node app.js backup ./nope ./backup
❌ Ошибка: Источник "./nope" не существует
```

### 7. Переименование в существующий файл

```bash
$ node app.js rename <id> <id2>.json   # если <id2>.json уже есть
❌ Ошибка: Файл <id2>.json уже существует
```

---

## 🎯 Индивидуальное мини-задание

**Реализованная модификация: сортировка товаров по имени в команде `list`.**

Было в `src/cli/commands.js`:

```js
case 'list': {
  const list = await listProducts();
  list.forEach(item => {
    console.log(`  [${item.id}] ${item.name} — ${item.category} — £${item.price}`);
  });
}
```

Стало:

```js
case 'list': {
  const list = await listProducts();
  if (list.length === 0) {
    console.log('📭 Список пуст');
  } else {
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
    console.log(`📋 Всего товаров: ${list.length} (отсортировано по имени)\n`);
    sorted.forEach(item => {
      console.log(`  [${item.id}] ${item.name} — ${item.category} — £${item.price}`);
    });
  }
  break;
}
```

**Что изменилось:** добавлен `.sort()` с `localeCompare` для корректной сортировки строк с учётом локали (кириллица, латиница).

**Другие идеи для мини-задания:**

- Фильтрация по категории: `node app.js list sofa`.
- Экспорт в CSV.
- Восстановление из бэкапа (команда `restore`).
- Изменение формата индекса (объект вместо массива).

---

## 📚 Использованные модули Node.js

| Модуль | Где используется |
|--------|------------------|
| `process` | `app.js` — `process.argv` |
| `fs` / `fs.promises` | `fileManager.js`, `backupManager.js` |
| `path` | везде — работа с путями |
| `stream` | `readStream.js`, `writeStream.js`, `transformStream.js` |
| `worker_threads` | `statsWorker.js`, `workerRunner.js` |
| `readline` | `search.js` |

**Сторонних зависимостей нет.**

---

## 📄 Лицензия
