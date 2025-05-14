# Бэкенд на Express с авторизацией (PostgreSQL, Redis, Prisma, TypeScript)

Простой бэкенд, написанный на Express.js с использованием TypeScript. Реализует сессионную аутентификацию (регистрация и вход) с хранением пользователей в PostgreSQL (через Prisma ORM) и сессий в Redis.

## Возможности

- Регистрация пользователей (email/пароль)
- Вход пользователей (сессионная аутентификация)
- Хеширование паролей с использованием bcrypt
- Хранение данных пользователей в PostgreSQL
- Хранение сессий в Redis
- Использование Prisma ORM для взаимодействия с базой данных
- Настроено для запуска с Docker Compose (PostgreSQL, Redis)

## Технологии

- **Фреймворк:** Express.js
- **Язык:** TypeScript
- **База данных:** PostgreSQL
- **Кэш/Хранилище сессий:** Redis
- **ORM:** Prisma
- **Хеширование паролей:** bcrypt
- **Управление зависимостями:** npm
- **Контейнеризация:** Docker, Docker Compose

## API Эндпоинты

**Базовый URL:** `http://localhost:3000`

### Аутентификация (`/auth`)

#### 1. Регистрация нового пользователя

- **Метод:** `POST`
- **Путь:** `/auth/register`
- **Тело запроса:** `JSON`
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword"
  }
  ```
- **Успешный ответ (Код: 201 Created):**
  - Устанавливает cookie с сессией.
  ```json
  {
    "message": "User registered successfully",
    "userId": 1
  }
  ```
- **Ошибки:**
  - **Код: 400 Bad Request**
    - Если `email` или `password` отсутствуют.
    ```json
    { "message": "Email and password are required" }
    ```
    - Если пользователь с таким `email` уже существует.
    ```json
    { "message": "User already exists" }
    ```
  - **Код: 500 Internal Server Error** - В случае внутренней ошибки сервера.
  ```json
  { "message": "Internal server error" }
  ```

#### 2. Вход пользователя

- **Метод:** `POST`
- **Путь:** `/auth/login`
- **Тело запроса:** `JSON`
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword"
  }
  ```
- **Успешный ответ (Код: 200 OK):**
  - Устанавливает cookie с сессией.
  ```json
  {
    "message": "Login successful",
    "userId": 1
  }
  ```
- **Ошибки:**
  - **Код: 400 Bad Request** - Если `email` или `password` отсутствуют.
  ```json
  { "message": "Email and password are required" }
  ```
  - **Код: 401 Unauthorized** - Если пользователь с таким `email` не найден или пароль неверный.
  ```json
  { "message": "Invalid credentials" }
  ```
  - **Код: 500 Internal Server Error** - В случае внутренней ошибки сервера.
  ```json
  { "message": "Internal server error" }
  ```

#### 3. Выход пользователя

- **Метод:** `POST`
- **Путь:** `/auth/logout`
- **Тело запроса:** Нет
- **Успешный ответ (Код: 200 OK):**
  - Удаляет сессию пользователя и соответствующий cookie.
  ```json
  {
    "message": "Logout successful"
  }
  ```
- **Ошибки:**
  - **Код: 500 Internal Server Error** - Если не удалось завершить сеанс.
  ```json
  { "message": "Could not log out, please try again" }
  ```

### Профиль пользователя (`/api`)

#### 1. Получение данных текущего пользователя

- **Метод:** `GET`
- **Путь:** `/api/profile`
- **Аутентификация:** Требуется (необходимо быть залогиненым, используется cookie сессии)
- **Тело запроса:** Нет
- **Успешный ответ (Код: 200 OK):**
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2023-10-27T10:00:00.000Z"
  }
  ```
- **Ошибки:**
  - **Код: 401 Unauthorized** - Если пользователь не аутентифицирован (нет валидной сессии).
  ```json
  { "message": "Unauthorized: Please log in." }
  ```
  - **Код: 404 Not Found** - Если пользователь, связанный с сессией, не найден (маловероятно при валидной сессии).
  ```json
  { "message": "User not found" }
  ```
  - **Код: 500 Internal Server Error** - В случае внутренней ошибки сервера.
  ```json
  { "message": "Internal server error" }
  ```

### WebDAV Интеграция (`/api/webdav`)

Эти эндпоинты требуют аутентификации (пользователь должен быть залогинен).

#### 1. Получение списка файлов и папок из директории WebDAV (рекурсивно, только файлы)

- **Метод:** `GET`
- **Путь:** `/api/webdav/list`
- **Аутентификация:** Требуется
- \*\*Параметры запроса (Query Parameters):
  - `directoryPath` (string, обязательный): Полный путь к директории на WebDAV сервере, содержимое которой нужно получить.
    _Пример: `/obsval/FrontEnd/SBORNICK/`_
- **Успешный ответ (Код: 200 OK):**
  Массив объектов, описывающих файлы. Каждый объект соответствует структуре `FileStat` из библиотеки `webdav`.
  ```json
  [
    {
      "filename": "/path/to/your/directory/file1.txt",
      "basename": "file1.txt",
      "lastmod": "Wed, 19 Feb 2025 08:06:12 GMT",
      "size": 12345,
      "type": "file",
      "etag": "some-etag-value",
      "mime": "text/plain"
    }
    // ... другие файлы
  ]
  ```
- **Ошибки:**
  - **Код: 400 Bad Request** - Если параметр `directoryPath` отсутствует.
    ```json
    { "message": "directoryPath query parameter is required" }
    ```
  - **Код: 401 Unauthorized** - Если пользователь не аутентифицирован.
  - **Код: 404 Not Found** - Если указанная директория не найдена на WebDAV сервере.
    ```json
    { "message": "Directory not found: /path/to/nonexistent/directory" }
    ```
  - **Код: 500 Internal Server Error** - Если WebDAV сервис не сконфигурирован (отсутствуют переменные окружения) или другая внутренняя ошибка сервера/WebDAV.
    ```json
    { "message": "WebDAV service is not configured." }
    // или
    { "message": "Internal server error while listing WebDAV directory" }
    ```

#### 2. Получение содержимого конкретного файла с WebDAV

- **Метод:** `GET`
- **Путь:** `/api/webdav/file`
- **Аутентификация:** Требуется
- \*\*Параметры запроса (Query Parameters):
  - `filePath` (string, обязательный): Полный путь к файлу на WebDAV сервере, содержимое которого нужно получить.
    _Пример: `/obsval/FrontEnd/SBORNICK/JS/Array.md`_
- **Успешный ответ (Код: 200 OK):**
  - Тело ответа содержит сырое содержимое файла.
  - Заголовок `Content-Type` устанавливается на основе расширения файла (например, `text/markdown; charset=utf-8`, `application/json; charset=utf-8`, `application/octet-stream`).
- **Ошибки:**
  - **Код: 400 Bad Request** - Если параметр `filePath` отсутствует.
    ```json
    { "message": "filePath query parameter is required" }
    ```
  - **Код: 401 Unauthorized** - Если пользователь не аутентифицирован.
  - **Код: 404 Not Found** - Если указанный файл не найден на WebDAV сервере.
    ```json
    { "message": "File not found: /path/to/nonexistent/file.txt" }
    ```
  - **Код: 500 Internal Server Error** - Если WebDAV сервис не сконфигурирован или другая внутренняя ошибка сервера/WebDAV.
    ```json
    { "message": "WebDAV service is not configured." }
    // или
    { "message": "Internal server error while reading WebDAV file" }
    ```

### Контент (`/api/content`)

Эти эндпоинты требуют аутентификации (пользователь должен быть залогинен).

#### 1. Получение списка блоков контента (с пагинацией и фильтрацией)

- **Метод:** `GET`
- **Путь:** `/api/content/blocks`
- **Аутентификация:** Требуется
- **Параметры запроса (Query Parameters):**
  - `page` (number, опциональный, по умолчанию: `1`): Номер страницы для пагинации.
  - `limit` (number, опциональный, по умолчанию: `10`): Количество элементов на странице.
  - `webdavPath` (string, опциональный): Часть пути к файлу WebDAV для поиска (регистронезависимый `contains`).
    _Пример: `SBORNICK/JS/Array`_
  - `mainCategory` (string, опциональный): Основная категория контента (регистронезависимый `equals`).
    _Пример: `JS`_
  - `subCategory` (string, опциональный): Подкатегория контента (регистронезависимый `equals`).
    _Пример: `Array`_
  - `filePathId` (string, опциональный): Прямой ID файла (`ContentFile`), к которому принадлежат блоки.
    _Пример: `clxyz12340000abcd1234efgh`_
  - `q` (string, опциональный): Строка для полнотекстового поиска (без учета регистра) по полям `blockTitle`, `textContent` и `codeFoldTitle` контентных блоков.
    _Пример: `useEffect hook`_
  - `sortBy` (string, опциональный, по умолчанию: `orderInFile`): Поле для сортировки.
    Доступные значения: `orderInFile`, `blockLevel`, `createdAt`, `updatedAt`, `file.webdavPath`.
  - `sortOrder` (string, опциональный, по умолчанию: `asc`): Направление сортировки.
    Доступные значения: `asc` (по возрастанию), `desc` (по убыванию).
- **Успешный ответ (Код: 200 OK):**
  Объект, содержащий массив блоков контента и информацию о пагинации.
  ```json
  {
    "data": [
      {
        "id": "clxblock0001abcd1234efgh",
        "fileId": "clxfile0000abcd1234efgh",
        "pathTitles": ["Родительский Заголовок 1", "Родительский Заголовок 2"],
        "blockTitle": "Заголовок этого блока",
        "blockLevel": 3,
        "textContent": "Какой-то текстовый контент...",
        "orderInFile": 0,
        "codeContent": "console.log('Hello');",
        "codeLanguage": "javascript",
        "isCodeFoldable": false,
        "codeFoldTitle": null,
        "extractedUrls": [
          "http://example.com/page1",
          "https://another-site.org/resource",
          "https://codesandbox.io/p/sandbox/uselocalstorage-pustoy-44tjkj"
        ],
        "currentUserSolvedCount": 2,
        "createdAt": "2023-11-01T10:00:00.000Z",
        "updatedAt": "2023-11-01T10:00:00.000Z",
        "file": {
          // Информация о связанном файле
          "id": "clxfile0000abcd1234efgh",
          "webdavPath": "/obsval/FrontEnd/SBORNICK/JS/Example.md",
          "mainCategory": "JS",
          "subCategory": "Example",
          "createdAt": "2023-11-01T09:00:00.000Z",
          "updatedAt": "2023-11-01T09:00:00.000Z"
        }
      }
      // ... другие блоки
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 100,
      "totalPages": 10
    }
  }
  ```
- **Ошибки:**
  - **Код: 400 Bad Request**
    - Если `page` или `limit` не являются положительными целыми числами.
    ```json
    { "message": "Page number must be a positive integer." }
    // или
    { "message": "Limit must be a positive integer." }
    ```
  - **Код: 401 Unauthorized** - Если пользователь не аутентифицирован.
  - **Код: 500 Internal Server Error** - В случае внутренней ошибки сервера.

#### 2. Получение конкретного блока контента по ID

- **Метод:** `GET`
- **Путь:** `/api/content/blocks/:id`
- **Аутентификация:** Требуется
- **Параметры пути (Path Parameters):**
  - `id` (string, обязательный): ID блока контента, который нужно получить.
- **Успешный ответ (Код: 200 OK):**
  Объект, описывающий запрошенный блок контента, включая информацию о связанном файле.
  ```json
  {
    "id": "clxblock0001abcd1234efgh",
    "fileId": "clxfile0000abcd1234efgh",
    "pathTitles": ["Родительский Заголовок 1"],
    "blockTitle": "Конкретный Заголовок",
    "blockLevel": 2,
    "textContent": "Детальное описание этого блока.",
    "orderInFile": 5,
    "codeContent": null,
    "codeLanguage": null,
    "isCodeFoldable": false,
    "codeFoldTitle": null,
    "extractedUrls": [
      "https://developer.mozilla.org/docs/Web/JavaScript",
      "https://leetcode.com/problems/concatenation-of-array/"
    ],
    "currentUserSolvedCount": 0,
    "createdAt": "2023-11-01T10:05:00.000Z",
    "updatedAt": "2023-11-01T10:05:00.000Z",
    "file": {
      "id": "clxfile0000abcd1234efgh",
      "webdavPath": "/obsval/FrontEnd/SBORNICK/JS/Another.md",
      "mainCategory": "JS",
      "subCategory": "Another",
      "createdAt": "2023-11-01T09:00:00.000Z",
      "updatedAt": "2023-11-01T09:00:00.000Z"
    }
  }
  ```
- **Ошибки:**
  - **Код: 401 Unauthorized** - Если пользователь не аутентифицирован.
  - **Код: 404 Not Found** - Если блок контента с указанным ID не найден.
    ```json
    { "message": "Content block not found" }
    ```
  - **Код: 500 Internal Server Error** - В случае внутренней ошибки сервера.

### POST /api/admin/update-content

Запускает процесс обновления контента из WebDAV. Сканирует указанную в конфигурации директорию на WebDAV, парсит `.md` файлы и сохраняет их структуру (заголовки, текст, блоки кода) в базу данных.

**Защита**: Требуется аутентификация пользователя.

**Тело запроса**: Пустое.

**Пример ответа (успех)**:

```json
{
  "status": "Completed",
  "processedFiles": 2,
  "totalBlocksCreated": 15,
  "errors": []
}
```

**Пример ответа (ошибка)**:

```json
{
  "status": "Failed: Error during processing",
  "message": "Specific error message",
  "errors": [
    {
      "filePath": "/obsval/FrontEnd/SBORNICK/JS/ProblemFile.md",
      "error": "Details about parsing or saving error"
    }
  ]
}
```

### GET /api/content/categories

Возвращает иерархический список всех основных категорий и вложенных в них подкатегорий. Основные категории и подкатегории внутри каждой основной категории отсортированы по алфавиту.

**Защита**: Требуется аутентификация пользователя.

**Параметры запроса**: Нет.

**Пример ответа (успех)**:

```json
[
  {
    "name": "JS",
    "subCategories": ["Array", "Async", "Objects"]
  },
  {
    "name": "REACT",
    "subCategories": ["Components", "Hooks", "State"]
  },
  {
    "name": "TS",
    "subCategories": ["Enums", "Generics", "Interfaces"]
  }
]
```

**Возможные ошибки**:

- `500 Internal Server Error`: Ошибка при получении иерархического списка категорий с сервера.

### PATCH /api/content/blocks/:blockId/progress

Обновляет счетчик "решенных задач" (`solvedCount`) для указанного блока контента (`blockId`) для текущего аутентифицированного пользователя. Позволяет увеличить или уменьшить счетчик.

**Защита**: Требуется аутентификация пользователя.

**Параметры пути**:

- `blockId` (string, обязательный): ID блока контента, для которого обновляется прогресс.

**Тело запроса** (JSON):

```json
{
  "action": "increment"
}
```

Или

```json
{
  "action": "decrement"
}
```

- `action` (string, обязательный): Действие для выполнения. Может быть `"increment"` или `"decrement"`.

**Успешный ответ (Код: 200 OK)**:
Возвращает объект с обновленным прогрессом пользователя.

```json
{
  "userId": 1,
  "blockId": "clxblock0001abcd1234efgh",
  "solvedCount": 3
}
```

**Возможные ошибки**:

- `400 Bad Request`:
  - Если `action` отсутствует или имеет неверное значение.
  ```json
  { "message": "Invalid action. Must be 'increment' or 'decrement'." }
  ```
- `401 Unauthorized`: Если пользователь не аутентифицирован.
- `404 Not Found`:
  - Если блок контента с указанным `blockId` не найден (например, при попытке инкрементировать прогресс для несуществующего блока или если произошла ошибка P2025 в Prisma при обновлении).
  ```json
  {
    "message": "Content block not found or user progress record inconsistency."
  }
  ```
- `500 Internal Server Error`: В случае внутренней ошибки сервера при обновлении прогресса.
  ```json
  { "message": "Failed to update content progress" }
  ```

## Переменные окружения

- **Docker Compose:**
  ```yaml
  version: "3.8"
  services:
    postgres:
      image: postgres
      ports:
        - "5432:5432"
      environment:
        POSTGRES_DB: postgres
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
    redis:
      image: redis
      ports:
        - "6379:6379"
  ```
- **Prisma:**

  ```yaml
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  generator client {
    provider = "prisma-client-js"
  }

  model ContentFile {
    id        String   @id @default(uuid())
    webdavPath String
    mainCategory String
    subCategory String
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }

  model ContentBlock {
    id        String   @id @default(uuid())
    fileId    String
    pathTitles String[]
    blockTitle String
    blockLevel Int
    textContent String
    orderInFile Int
    codeContent String
    codeLanguage String
    isCodeFoldable Boolean
    codeFoldTitle String
    extractedUrls String[]
    solvedCount Int
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    file      ContentFile @relation(fields: [fileId], references: [id])
  }
  ```

## Дополнительные команды Prisma

- **Генерация Prisma клиента (после изменений схемы):**
  ```bash
  npx prisma generate
  ```
- **Открытие Prisma Studio (GUI для просмотра данных):**
  ```bash
  npx prisma studio
  ```

## Завершение работы

- Чтобы остановить Docker контейнеры:
  ```bash
  docker-compose down
  ```
- Чтобы остановить сервер, запущенный через `npm run dev` или `npm start`, нажмите `Ctrl + C` в терминале.
