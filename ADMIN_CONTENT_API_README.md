# 🔧 Admin Content Management API

Полная документация для административных эндпоинтов управления контентом и теорией.

## 🔑 Авторизация

Все эндпоинты требуют роль `ADMIN`. Авторизация происходит через cookie-based сессии.

---

## 📁 Управление файлами контента

### 1. Получить список файлов

**GET** `/api/admin/content/files`

#### Query Parameters

| Параметр       | Тип     | Описание                                 |
| -------------- | ------- | ---------------------------------------- |
| `page`         | integer | Номер страницы (по умолчанию: 1)         |
| `limit`        | integer | Элементов на странице (по умолчанию: 20) |
| `mainCategory` | string  | Фильтр по основной категории             |
| `search`       | string  | Поиск по пути и подкатегории             |

#### Пример запроса

```javascript
GET /api/admin/content/files?page=1&limit=10&mainCategory=JS&search=Array
```

#### Response

```json
{
  "files": [
    {
      "id": "clx123456789",
      "webdavPath": "/obsval/FrontEnd/SBORNICK/JS/Array.md",
      "mainCategory": "JS",
      "subCategory": "Array",
      "lastFileHash": "abc123...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "blocks": 15
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Создать файл контента

**POST** `/api/admin/content/files`

#### Request Body

```json
{
  "webdavPath": "/obsval/FrontEnd/SBORNICK/JS/NewTopic.md",
  "mainCategory": "JS",
  "subCategory": "NewTopic",
  "lastFileHash": "def456..." // опционально
}
```

#### Response

```json
{
  "id": "clx987654321",
  "webdavPath": "/obsval/FrontEnd/SBORNICK/JS/NewTopic.md",
  "mainCategory": "JS",
  "subCategory": "NewTopic",
  "lastFileHash": "def456...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "_count": {
    "blocks": 0
  }
}
```

### 3. Обновить файл контента

**PUT** `/api/admin/content/files/{fileId}`

#### Request Body

```json
{
  "webdavPath": "/new/path/to/file.md",
  "mainCategory": "REACT",
  "subCategory": "Hooks",
  "lastFileHash": "new_hash..."
}
```

### 4. Удалить файл контента

**DELETE** `/api/admin/content/files/{fileId}`

⚠️ **Внимание**: Удаление файла приведет к каскадному удалению всех связанных блоков и прогресса пользователей.

---

## 📄 Управление блоками контента

### 1. Получить список блоков

**GET** `/api/admin/content/blocks`

#### Query Parameters

| Параметр | Тип     | Описание                                 |
| -------- | ------- | ---------------------------------------- |
| `page`   | integer | Номер страницы                           |
| `limit`  | integer | Элементов на странице                    |
| `fileId` | string  | Фильтр по ID файла                       |
| `search` | string  | Поиск по заголовку и текстовому контенту |

#### Response

```json
{
  "blocks": [
    {
      "id": "clx111222333",
      "fileId": "clx123456789",
      "pathTitles": ["JavaScript", "Arrays", "map() method"],
      "blockTitle": "map() method",
      "blockLevel": 3,
      "orderInFile": 1,
      "textContent": "Метод map() создает новый массив...",
      "codeContent": "const numbers = [1, 2, 3];\nconst doubled = numbers.map(x => x * 2);",
      "codeLanguage": "javascript",
      "isCodeFoldable": false,
      "codeFoldTitle": null,
      "extractedUrls": [
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map"
      ],
      "rawBlockContentHash": "xyz789...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "file": {
        "id": "clx123456789",
        "webdavPath": "/obsval/FrontEnd/SBORNICK/JS/Array.md",
        "mainCategory": "JS",
        "subCategory": "Array"
      },
      "_count": {
        "progressEntries": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Создать блок контента

**POST** `/api/admin/content/blocks`

#### Request Body

```json
{
  "fileId": "clx123456789",
  "pathTitles": ["JavaScript", "Arrays", "filter() method"],
  "blockTitle": "filter() method",
  "blockLevel": 3,
  "orderInFile": 2,
  "textContent": "Метод filter() создает новый массив со всеми элементами...",
  "codeContent": "const numbers = [1, 2, 3, 4, 5];\nconst evens = numbers.filter(x => x % 2 === 0);",
  "codeLanguage": "javascript",
  "isCodeFoldable": false,
  "codeFoldTitle": null,
  "extractedUrls": [
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter"
  ],
  "rawBlockContentHash": "abc123..."
}
```

### 3. Обновить блок контента

**PUT** `/api/admin/content/blocks/{blockId}`

#### Request Body

```json
{
  "blockTitle": "Обновленный заголовок",
  "textContent": "Обновленный текст...",
  "codeContent": "// Обновленный код",
  "isCodeFoldable": true,
  "codeFoldTitle": "Показать код"
}
```

### 4. Удалить блок контента

**DELETE** `/api/admin/content/blocks/{blockId}`

---

## 🧠 Управление карточками теории

### 1. Получить список карточек

**GET** `/api/admin/theory/cards`

#### Query Parameters

| Параметр   | Тип     | Описание                              |
| ---------- | ------- | ------------------------------------- |
| `page`     | integer | Номер страницы                        |
| `limit`    | integer | Элементов на странице                 |
| `category` | string  | Фильтр по категории                   |
| `deck`     | string  | Поиск по названию колоды              |
| `search`   | string  | Поиск по вопросу, ответу и категориям |

### 2. Создать карточку теории

**POST** `/api/admin/theory/cards`

#### Request Body

```json
{
  "ankiGuid": "1234567890123",
  "cardType": "Простая",
  "deck": "СБОРНИК::JS ТЕОРИЯ",
  "category": "JS ТЕОРИЯ",
  "subCategory": "Операторы",
  "questionBlock": "<p>Что такое оператор <code>typeof</code>?</p>",
  "answerBlock": "<p>Оператор <code>typeof</code> возвращает строку, указывающую тип операнда.</p>",
  "tags": ["javascript", "operators"],
  "orderIndex": 10
}
```

### 3. Обновить карточку теории

**PUT** `/api/admin/theory/cards/{cardId}`

#### Request Body

```json
{
  "questionBlock": "<p>Обновленный вопрос</p>",
  "answerBlock": "<p>Обновленный ответ</p>",
  "tags": ["javascript", "operators", "new-tag"],
  "subCategory": "Новая подкатегория"
}
```

### 4. Удалить карточку теории

**DELETE** `/api/admin/theory/cards/{cardId}`

---

## 🔥 Массовые операции

### 1. Массовое удаление контента

**DELETE** `/api/admin/content/bulk-delete`

#### Request Body

```json
{
  "fileIds": ["clx123", "clx456", "clx789"],
  "blockIds": ["clx111", "clx222", "clx333"]
}
```

#### Response

```json
{
  "message": "Массовое удаление завершено",
  "deletedFiles": 3,
  "deletedBlocks": 2,
  "errors": []
}
```

### 2. Массовое удаление карточек теории

**DELETE** `/api/admin/theory/bulk-delete`

#### Request Body

```json
{
  "cardIds": ["clx111", "clx222", "clx333"]
}
```

### 3. Массовое обновление файлов контента

**PATCH** `/api/admin/content/bulk-update`

#### Request Body

```json
{
  "fileIds": ["clx123", "clx456"],
  "updateData": {
    "mainCategory": "REACT",
    "subCategory": "Hooks"
  }
}
```

### 4. Массовое обновление карточек теории

**PATCH** `/api/admin/theory/bulk-update`

#### Request Body

```json
{
  "cardIds": ["clx111", "clx222"],
  "updateData": {
    "category": "НОВАЯ КАТЕГОРИЯ",
    "tags": ["new-tag-1", "new-tag-2"]
  }
}
```

---

## ⚠️ Безопасность и ограничения

### Права доступа

- Все эндпоинты требуют роль `ADMIN`
- Используется cookie-based аутентификация
- Каждый запрос проверяется middleware `requireAdmin`

### Каскадные удаления

- При удалении файла удаляются все связанные блоки
- При удалении блоков/карточек удаляется весь связанный прогресс пользователей
- Операции удаления необратимы

### Валидация данных

- Проверка уникальности `webdavPath` для файлов
- Проверка уникальности `ankiGuid` для карточек
- Валидация обязательных полей
- Проверка существования связанных сущностей

---

## 📊 Коды ошибок

| Код | Описание                                    |
| --- | ------------------------------------------- |
| 400 | Некорректные данные запроса                 |
| 401 | Не авторизован                              |
| 403 | Недостаточно прав (не админ)                |
| 404 | Сущность не найдена                         |
| 409 | Конфликт (дублирование уникальных значений) |
| 500 | Внутренняя ошибка сервера                   |

---

## 🚀 Примеры использования

### Создание полного урока

```javascript
// 1. Создаем файл
const file = await fetch("/api/admin/content/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    webdavPath: "/obsval/FrontEnd/SBORNICK/React/Hooks.md",
    mainCategory: "REACT",
    subCategory: "Hooks",
  }),
});

// 2. Добавляем блоки
const block1 = await fetch("/api/admin/content/blocks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    fileId: file.id,
    pathTitles: ["React", "Hooks", "useState"],
    blockTitle: "useState Hook",
    blockLevel: 3,
    orderInFile: 1,
    textContent:
      "useState позволяет добавлять состояние в функциональные компоненты...",
    codeContent: "const [count, setCount] = useState(0);",
    codeLanguage: "javascript",
  }),
});
```

### Массовое изменение категории

```javascript
// Изменяем категорию для нескольких файлов
await fetch("/api/admin/content/bulk-update", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    fileIds: ["clx123", "clx456", "clx789"],
    updateData: {
      mainCategory: "TYPESCRIPT",
    },
  }),
});
```
