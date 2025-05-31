# Content API Documentation

## Обзор

Content API предоставляет доступ к системе контент-блоков, которые парсятся из Markdown файлов WebDAV. Каждый блок содержит текстовый или код контент с возможностью отслеживания прогресса пользователя.

**Базовый URL:** `/api/content`

**Аутентификация:** Все endpoints требуют аутентификации через cookie сессии.

---

## Endpoints

### 1. Получение списка блоков контента

**GET** `/api/content/blocks`

Возвращает список блоков контента с пагинацией, фильтрацией и поиском.

#### Query Parameters

| Параметр       | Тип     | По умолчанию  | Описание                                                                                      |
| -------------- | ------- | ------------- | --------------------------------------------------------------------------------------------- |
| `page`         | integer | 1             | Номер страницы (минимум 1)                                                                    |
| `limit`        | integer | 10            | Количество элементов на странице (минимум 1)                                                  |
| `webdavPath`   | string  | -             | Часть пути к файлу WebDAV для поиска                                                          |
| `mainCategory` | string  | -             | Основная категория контента (например, "JS", "REACT")                                         |
| `subCategory`  | string  | -             | Подкатегория контента (например, "Array", "Hooks")                                            |
| `filePathId`   | string  | -             | ID файла для фильтрации блоков                                                                |
| `q`            | string  | -             | Строка для полнотекстового поиска по заголовку, тексту и коду                                 |
| `sortBy`       | string  | "orderInFile" | Поле для сортировки: `orderInFile`, `blockLevel`, `createdAt`, `updatedAt`, `file.webdavPath` |
| `sortOrder`    | string  | "asc"         | Направление сортировки: `asc`, `desc`                                                         |

#### Примеры запросов

```javascript
// Получить первые 20 блоков
GET /api/content/blocks?page=1&limit=20

// Поиск по JavaScript массивам
GET /api/content/blocks?mainCategory=JS&subCategory=Array

// Полнотекстовый поиск
GET /api/content/blocks?q=useEffect hook

// Фильтрация по пути файла
GET /api/content/blocks?webdavPath=SBORNICK/JS/Array

// Сортировка по дате создания (новые первые)
GET /api/content/blocks?sortBy=createdAt&sortOrder=desc
```

#### Response

```typescript
interface ContentBlocksResponse {
  data: ContentBlock[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ContentBlock {
  id: string;
  fileId: string;
  pathTitles: string[]; // Иерархия заголовков ["Level 1", "Level 2", "Block Title"]
  blockTitle: string;
  blockLevel: number; // Уровень заголовка (1-4)
  orderInFile: number;
  textContent?: string;
  codeContent?: string;
  codeLanguage?: string;
  isCodeFoldable: boolean;
  codeFoldTitle?: string;
  extractedUrls: string[];
  rawBlockContentHash?: string;
  createdAt: string;
  updatedAt: string;
  currentUserSolvedCount: number; // Количество решений текущего пользователя
  file: ContentFile;
}

interface ContentFile {
  id: string;
  webdavPath: string;
  mainCategory: string;
  subCategory: string;
  lastFileHash?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Пример ответа

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "fileId": "clx0987654321",
      "pathTitles": ["JavaScript", "Массивы", "Методы массивов"],
      "blockTitle": "Array.map()",
      "blockLevel": 3,
      "orderInFile": 1,
      "textContent": "Метод map() создает новый массив с результатом вызова указанной функции для каждого элемента массива.",
      "codeContent": "const numbers = [1, 2, 3];\nconst doubled = numbers.map(x => x * 2);",
      "codeLanguage": "javascript",
      "isCodeFoldable": false,
      "codeFoldTitle": null,
      "extractedUrls": [
        "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map"
      ],
      "rawBlockContentHash": "abc123def456",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "currentUserSolvedCount": 3,
      "file": {
        "id": "clx0987654321",
        "webdavPath": "/obsval/FrontEnd/SBORNICK/JS/Array.md",
        "mainCategory": "JS",
        "subCategory": "Array",
        "lastFileHash": "xyz789abc123",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 156,
    "totalPages": 16
  }
}
```

---

### 2. Получение конкретного блока контента

**GET** `/api/content/blocks/{id}`

Возвращает детальную информацию о блоке контента по его ID.

#### Path Parameters

| Параметр | Тип    | Описание          |
| -------- | ------ | ----------------- |
| `id`     | string | ID блока контента |

#### Пример запроса

```javascript
GET / api / content / blocks / clx1234567890;
```

#### Response

Возвращает объект `ContentBlock` (см. структуру выше).

#### Коды ошибок

- `404` - Блок контента не найден
- `401` - Пользователь не аутентифицирован
- `500` - Внутренняя ошибка сервера

---

### 3. Обновление прогресса пользователя

**PATCH** `/api/content/blocks/{blockId}/progress`

Увеличивает или уменьшает счетчик решений для блока контента.

#### Path Parameters

| Параметр  | Тип    | Описание          |
| --------- | ------ | ----------------- |
| `blockId` | string | ID блока контента |

#### Request Body

```typescript
interface ContentProgressUpdate {
  action: "increment" | "decrement";
}
```

#### Примеры запросов

```javascript
// Увеличить счетчик решений
PATCH /api/content/blocks/clx1234567890/progress
Content-Type: application/json

{
  "action": "increment"
}

// Уменьшить счетчик решений
PATCH /api/content/blocks/clx1234567890/progress
Content-Type: application/json

{
  "action": "decrement"
}
```

#### Response

```typescript
interface ContentProgressResponse {
  userId: number;
  blockId: string;
  solvedCount: number;
}
```

#### Пример ответа

```json
{
  "userId": 123,
  "blockId": "clx1234567890",
  "solvedCount": 4
}
```

#### Коды ошибок

- `400` - Неверное действие (action должен быть "increment" или "decrement")
- `401` - Пользователь не аутентифицирован
- `404` - Блок контента не найден
- `500` - Ошибка при обновлении прогресса

---

### 4. Получение иерархии категорий

**GET** `/api/content/categories`

Возвращает иерархический список всех категорий и подкатегорий контента.

#### Пример запроса

```javascript
GET / api / content / categories;
```

#### Response

```typescript
interface ContentCategory {
  name: string; // Основная категория
  subCategories: string[]; // Список подкатегорий
}
```

#### Пример ответа

```json
[
  {
    "name": "JS",
    "subCategories": ["Array", "Object", "Function", "Promise"]
  },
  {
    "name": "REACT",
    "subCategories": ["Hooks", "Components", "State", "Props"]
  },
  {
    "name": "TS",
    "subCategories": ["Types", "Interfaces", "Generics"]
  }
]
```

---

## Использование на фронтенде

### Пример компонента для отображения блоков

```typescript
import { useState, useEffect } from "react";

interface ContentBlock {
  id: string;
  blockTitle: string;
  textContent?: string;
  codeContent?: string;
  codeLanguage?: string;
  currentUserSolvedCount: number;
  file: {
    mainCategory: string;
    subCategory: string;
  };
}

interface ContentBlocksResponse {
  data: ContentBlock[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
}

const ContentBlocks: React.FC = () => {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(searchQuery && { q: searchQuery }),
        ...(selectedCategory && { mainCategory: selectedCategory }),
      });

      const response = await fetch(`/api/content/blocks?${params}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch blocks");

      const data: ContentBlocksResponse = await response.json();
      setBlocks(data.data);
    } catch (error) {
      console.error("Error fetching blocks:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (
    blockId: string,
    action: "increment" | "decrement"
  ) => {
    try {
      const response = await fetch(`/api/content/blocks/${blockId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error("Failed to update progress");

      // Обновляем локальное состояние
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId
            ? {
                ...block,
                currentUserSolvedCount:
                  action === "increment"
                    ? block.currentUserSolvedCount + 1
                    : Math.max(0, block.currentUserSolvedCount - 1),
              }
            : block
        )
      );
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, [page, searchQuery, selectedCategory]);

  return (
    <div>
      <input
        type="text"
        placeholder="Поиск по контенту..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {blocks.map((block) => (
        <div key={block.id} className="content-block">
          <h3>{block.blockTitle}</h3>
          <p>
            Категория: {block.file.mainCategory} / {block.file.subCategory}
          </p>
          <p>Решений: {block.currentUserSolvedCount}</p>

          {block.textContent && <p>{block.textContent}</p>}

          {block.codeContent && (
            <pre>
              <code className={`language-${block.codeLanguage}`}>
                {block.codeContent}
              </code>
            </pre>
          )}

          <div>
            <button onClick={() => updateProgress(block.id, "increment")}>
              ✅ Решено
            </button>
            <button onClick={() => updateProgress(block.id, "decrement")}>
              ❌ Отменить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Пример хука для работы с API

```typescript
import { useState, useCallback } from "react";

export const useContentAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = useCallback(
    async (
      params: {
        page?: number;
        limit?: number;
        q?: string;
        mainCategory?: string;
        subCategory?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
      } = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/content/blocks?${searchParams}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchBlock = useCallback(async (blockId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/content/blocks/${blockId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProgress = useCallback(
    async (blockId: string, action: "increment" | "decrement") => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/content/blocks/${blockId}/progress`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ action }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/content/categories", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchBlocks,
    fetchBlock,
    updateProgress,
    fetchCategories,
  };
};
```

---

## Обработка ошибок

Все endpoints возвращают стандартные HTTP коды ошибок:

- **400 Bad Request** - Неверные параметры запроса
- **401 Unauthorized** - Пользователь не аутентифицирован
- **404 Not Found** - Ресурс не найден
- **500 Internal Server Error** - Внутренняя ошибка сервера

Формат ошибки:

```json
{
  "message": "Описание ошибки"
}
```

---

## Рекомендации по использованию

1. **Пагинация**: Используйте разумные значения `limit` (10-50) для избежания больших ответов
2. **Поиск**: Комбинируйте фильтры по категориям с полнотекстовым поиском для лучших результатов
3. **Кэширование**: Кэшируйте результаты категорий, так как они изменяются редко
4. **Прогресс**: Обновляйте прогресс локально сразу после запроса для лучшего UX
5. **Обработка ошибок**: Всегда обрабатывайте ошибки сети и показывайте пользователю понятные сообщения

---

## Дополнительные endpoints

Также доступны следующие endpoints в основном приложении:

- `GET /api/content/categories` - Получение иерархии категорий (уже описан выше)
- `POST /api/admin/update-content` - Обновление контента из WebDAV (только для администраторов)
- `GET /api/webdav/list` - Получение списка файлов WebDAV
- `GET /api/webdav/file` - Получение содержимого файла WebDAV
