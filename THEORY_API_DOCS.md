# API Документация для Теоретических Карточек

## Обзор

Система теоретических карточек позволяет импортировать карточки из Anki и предоставляет API для работы с ними. Карточки имеют структуру "вопрос-ответ" и поддерживают отслеживание прогресса пользователей.

## Модели данных

### TheoryCard

```typescript
{
  id: string;              // Уникальный ID карточки
  ankiGuid: string;        // GUID из Anki (уникальный)
  cardType: string;        // Тип карточки ("Простая")
  deck: string;            // Колода из Anki ("СБОРНИК::JS ТЕОРИЯ")
  category: string;        // Основная категория ("JS ТЕОРИЯ")
  subCategory?: string;    // Подкатегория ("Операторы", "Область видимости")
  questionBlock: string;   // HTML контент вопроса
  answerBlock: string;     // HTML контент ответа
  tags: string[];          // Теги карточки
  orderIndex: number;      // Порядок в файле импорта
  createdAt: DateTime;
  updatedAt: DateTime;
  currentUserSolvedCount: number; // Количество решений текущего пользователя
}
```

### UserTheoryProgress

```typescript
{
  id: string;
  userId: number;
  cardId: string;
  solvedCount: number; // Количество решений пользователя
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

## Endpoints

### 1. Получение списка карточек

```
GET /api/theory/cards
```

**Параметры запроса:**

- `page` (number, default: 1) - Номер страницы
- `limit` (number, default: 10) - Количество карточек на странице
- `category` (string) - Фильтр по категории
- `subCategory` (string) - Фильтр по подкатегории
- `deck` (string) - Поиск по названию колоды
- `sortBy` (string) - Поле для сортировки (orderIndex, createdAt, updatedAt)
- `sortOrder` (string) - Порядок сортировки (asc, desc)
- `q` (string) - Полнотекстовый поиск по вопросу и ответу
- `onlyUnstudied` (boolean, default: false) - Показывать только неизученные карточки (solvedCount = 0)

**Ответ:**

```json
{
  "data": [
    {
      "id": "card_id",
      "ankiGuid": "unique_guid",
      "cardType": "Простая",
      "deck": "СБОРНИК::JS ТЕОРИЯ",
      "category": "JS ТЕОРИЯ",
      "subCategory": "Операторы",
      "questionBlock": "Что такое замыкание?",
      "answerBlock": "<p>Замыкание - это...</p>",
      "tags": ["javascript", "closure"],
      "orderIndex": 0,
      "createdAt": "2025-05-26T10:00:00.000Z",
      "updatedAt": "2025-05-26T10:00:00.000Z",
      "currentUserSolvedCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 628,
    "totalPages": 63
  }
}
```

### 2. Получение конкретной карточки

```
GET /api/theory/cards/:id
```

**Ответ:** Объект карточки (см. выше)

### 3. Обновление прогресса по карточке

```
PATCH /api/theory/cards/:cardId/progress
```

**Тело запроса:**

```json
{
  "action": "increment" | "decrement"
}
```

**Ответ:**

```json
{
  "userId": 1,
  "cardId": "card_id",
  "solvedCount": 4
}
```

### 4. Получение категорий

```
GET /api/theory/categories
```

**Ответ:**

```json
[
  {
    "name": "JS ТЕОРИЯ",
    "subCategories": [
      {
        "name": "Операторы",
        "cardCount": 65
      },
      {
        "name": "Область видимости",
        "cardCount": 41
      }
    ],
    "totalCards": 106
  }
]
```

### 5. Импорт Anki файла (Admin)

```
POST /api/admin/import-anki
```

**Тело запроса:** multipart/form-data с файлом `ankiFile`

**Ответ:**

```json
{
  "status": "Completed",
  "totalCards": 628,
  "createdCards": 628,
  "updatedCards": 0,
  "errors": [
    {
      "line": 52,
      "error": "Недостаточно колонок в строке"
    }
  ]
}
```

## Формат Anki файла

Файл должен быть в формате TSV (Tab-Separated Values) с колонками:

1. GUID - уникальный идентификатор карточки
2. Card Type - тип карточки
3. Deck - название колоды
4. Question Block - HTML контент вопроса
5. Answer Block - HTML контент ответа
6. Tags - теги через запятую (опционально)

Пример строки:

```
u}GaM!ESHu	Простая	СБОРНИК::JS ТЕОРИЯ::Операторы	Что такое замыкание?	<p>Замыкание - это функция...</p>	javascript,closure
```

## Обработка изображений

Система автоматически конвертирует относительные пути изображений в полные URL Supabase:

- Исходный путь: `<img src="paste-123.jpg">`
- Результат: `<img src="https://dydifvbmwsuxxxnixbep.supabase.co/storage/v1/object/public/anreshka-storage/paste-123.jpg">`

## Аутентификация

Все endpoints требуют аутентификации через сессии. Пользователь должен быть залогинен.

## Ошибки

- `400` - Неверные параметры запроса
- `401` - Не авторизован
- `404` - Карточка не найдена
- `500` - Внутренняя ошибка сервера
