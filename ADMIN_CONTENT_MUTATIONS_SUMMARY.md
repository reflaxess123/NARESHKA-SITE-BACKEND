# ✅ Реализованные эндпоинты мутаций контента

## 📋 Общая сводка

Реализованы полные CRUD операции для всех основных сущностей контента:

- ✅ **ContentFile** (файлы контента) - GET, POST, PUT, DELETE
- ✅ **ContentBlock** (блоки контента) - GET, POST, PUT, DELETE
- ✅ **TheoryCard** (карточки теории) - GET, POST, PUT, DELETE
- ✅ **Массовые операции** - Bulk DELETE и Bulk UPDATE

---

## 🔧 Файлы контента (ContentFile)

### Базовые операции:

- **GET** `/api/admin/content/files` - Список файлов с пагинацией и фильтрацией
- **POST** `/api/admin/content/files` - Создание нового файла
- **PUT** `/api/admin/content/files/{fileId}` - Обновление файла
- **DELETE** `/api/admin/content/files/{fileId}` - Удаление файла

### Фильтры и поиск:

- По основной категории (`mainCategory`)
- Поиск по пути WebDAV и подкатегории
- Пагинация (page, limit)

---

## 📄 Блоки контента (ContentBlock)

### Базовые операции:

- **GET** `/api/admin/content/blocks` - Список блоков с пагинацией
- **POST** `/api/admin/content/blocks` - Создание нового блока
- **PUT** `/api/admin/content/blocks/{blockId}` - Обновление блока
- **DELETE** `/api/admin/content/blocks/{blockId}` - Удаление блока

### Поддерживаемые поля:

- `fileId` - связь с файлом
- `pathTitles` - иерархия заголовков
- `blockTitle` - заголовок блока
- `blockLevel` - уровень заголовка (1-6)
- `orderInFile` - порядок в файле
- `textContent` - текстовое содержимое
- `codeContent` - код
- `codeLanguage` - язык программирования
- `isCodeFoldable` - возможность свернуть код
- `codeFoldTitle` - заголовок для сворачивания
- `extractedUrls` - извлеченные ссылки
- `rawBlockContentHash` - хеш содержимого

---

## 🧠 Карточки теории (TheoryCard)

### Базовые операции:

- **GET** `/api/admin/theory/cards` - Список карточек с пагинацией
- **POST** `/api/admin/theory/cards` - Создание новой карточки
- **PUT** `/api/admin/theory/cards/{cardId}` - Обновление карточки
- **DELETE** `/api/admin/theory/cards/{cardId}` - Удаление карточки

### Поддерживаемые поля:

- `ankiGuid` - уникальный идентификатор из Anki
- `cardType` - тип карточки
- `deck` - колода
- `category` - основная категория
- `subCategory` - подкатегория
- `questionBlock` - HTML содержимое вопроса
- `answerBlock` - HTML содержимое ответа
- `tags` - массив тегов
- `orderIndex` - порядковый номер

---

## 🔥 Массовые операции

### Удаление:

- **DELETE** `/api/admin/content/bulk-delete` - Массовое удаление файлов и блоков
- **DELETE** `/api/admin/theory/bulk-delete` - Массовое удаление карточек

### Обновление:

- **PATCH** `/api/admin/content/bulk-update` - Массовое обновление файлов
- **PATCH** `/api/admin/theory/bulk-update` - Массовое обновление карточек

---

## 🔒 Безопасность

### Middleware:

- Все эндпоинты защищены `requireAdmin` middleware
- Проверка роли `ADMIN` на каждый запрос
- Cookie-based аутентификация

### Валидация:

- Проверка уникальности `webdavPath` для файлов
- Проверка уникальности `ankiGuid` для карточек
- Валидация обязательных полей
- Проверка существования связанных сущностей

### Каскадные операции:

- При удалении файла автоматически удаляются все блоки
- При удалении блоков/карточек удаляется весь прогресс пользователей
- Транзакционность операций

---

## 📊 Возможности фильтрации и поиска

### Файлы контента:

- Фильтр по `mainCategory`
- Поиск по `webdavPath` и `subCategory`

### Блоки контента:

- Фильтр по `fileId`
- Поиск по `blockTitle` и `textContent`

### Карточки теории:

- Фильтр по `category` и `deck`
- Поиск по `questionBlock`, `answerBlock`, `category`, `subCategory`

---

## 🎯 Пример полного workflow

```javascript
// 1. Создание файла контента
const fileResponse = await fetch("/api/admin/content/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    webdavPath: "/obsval/FrontEnd/SBORNICK/React/Advanced.md",
    mainCategory: "REACT",
    subCategory: "Advanced",
  }),
});
const file = await fileResponse.json();

// 2. Добавление блоков к файлу
const blockResponse = await fetch("/api/admin/content/blocks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    fileId: file.id,
    pathTitles: ["React", "Advanced", "useCallback"],
    blockTitle: "useCallback Hook",
    blockLevel: 3,
    orderInFile: 1,
    textContent: "useCallback возвращает мемоизированную версию коллбэка...",
    codeContent:
      "const memoizedCallback = useCallback(() => { doSomething(a, b); }, [a, b]);",
    codeLanguage: "javascript",
  }),
});

// 3. Создание карточки теории
const cardResponse = await fetch("/api/admin/theory/cards", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    ankiGuid: Date.now().toString(),
    cardType: "Простая",
    deck: "СБОРНИК::REACT ТЕОРИЯ",
    category: "REACT ТЕОРИЯ",
    subCategory: "Hooks",
    questionBlock: "<p>Для чего используется <code>useCallback</code>?</p>",
    answerBlock:
      "<p><code>useCallback</code> используется для мемоизации функций...</p>",
    tags: ["react", "hooks", "performance"],
  }),
});
```

---

## 📈 Статистика включений

### Включенные связи в GET запросах:

**Файлы контента:**

- `_count.blocks` - количество блоков в файле

**Блоки контента:**

- `file` - информация о родительском файле
- `_count.progressEntries` - количество записей прогресса

**Карточки теории:**

- `_count.progressEntries` - количество записей прогресса

---

## 🔄 Интеграция с существующей системой

### Совместимость:

- Новые эндпоинты не влияют на существующие
- Импорт из WebDAV (`/api/admin/update-content`) продолжает работать
- Импорт Anki (`/api/admin/import-anki`) остается функциональным
- Публичные API (`/api/content/*`, `/api/theory/*`) без изменений

### Дополнительные возможности:

- Ручное создание контента через админ-панель
- Редактирование существующего контента
- Массовые операции для эффективного управления
- Детальная фильтрация и поиск

---

## ✨ Готово к использованию!

Все эндпоинты реализованы с полной документацией Swagger, проверкой типов TypeScript и готовы к использованию в продакшене.
