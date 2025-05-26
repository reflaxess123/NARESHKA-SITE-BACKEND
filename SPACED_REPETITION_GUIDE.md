# Руководство по системе интервального повторения

## Обзор

Система интервального повторения реализует алгоритм SM-2 (SuperMemo 2), аналогичный используемому в Anki. Она позволяет оптимизировать изучение карточек, показывая их в оптимальные моменты времени для максимального запоминания.

## Основные концепции

### Состояния карточек

- **NEW** - Новая карточка, которую пользователь еще не изучал
- **LEARNING** - Карточка в процессе первоначального изучения
- **REVIEW** - Карточка в режиме повторения (уже изучена)
- **RELEARNING** - Карточка в режиме переизучения (была забыта)

### Оценки сложности

- **again** - "Забыл" - карточка была забыта, нужно начать изучение заново
- **hard** - "Сложно" - ответ был дан с трудом
- **good** - "Хорошо" - нормальный ответ
- **easy** - "Легко" - очень легкий ответ

### Ключевые параметры

- **Ease Factor** - коэффициент легкости (от 1.30 до 2.50)
- **Interval** - интервал до следующего повторения
- **Due Date** - дата, когда карточку нужно показать снова
- **Learning Steps** - шаги изучения в минутах [1, 10]

## API Endpoints

### 1. Повторение карточки

```http
POST /api/theory/cards/{cardId}/review
```

**Тело запроса:**

```json
{
  "rating": "good",
  "responseTime": 3500
}
```

**Ответ:**

```json
{
  "userId": 1,
  "cardId": "card123",
  "newInterval": 3,
  "newDueDate": "2024-05-29T12:00:00.000Z",
  "easeFactor": 2.5,
  "cardState": "REVIEW",
  "reviewCount": 5,
  "lapseCount": 1,
  "nextReviewIntervals": {
    "again": 1,
    "hard": 2,
    "good": 3,
    "easy": 5
  }
}
```

### 2. Получение карточек к повторению

```http
GET /api/theory/cards/due?limit=20&includeNew=true&includeLearning=true&includeReview=true
```

**Ответ:**

```json
[
  {
    "id": "card123",
    "ankiGuid": "guid123",
    "questionBlock": "Что такое замыкание?",
    "answerBlock": "Функция, которая имеет доступ...",
    "category": "JS ТЕОРИЯ",
    "dueDate": "2024-05-26T12:00:00.000Z",
    "cardState": "REVIEW",
    "interval": 3,
    "easeFactor": 2.5,
    "reviewCount": 5,
    "lapseCount": 1,
    "isOverdue": true,
    "daysSinceLastReview": 5,
    "priority": 150
  }
]
```

### 3. Статистика по карточке

```http
GET /api/theory/cards/{cardId}/stats
```

**Ответ:**

```json
{
  "cardId": "card123",
  "userId": 1,
  "totalReviews": 10,
  "lapseCount": 2,
  "easeFactor": 2.3,
  "currentInterval": 7,
  "cardState": "REVIEW",
  "dueDate": "2024-05-30T12:00:00.000Z",
  "lastReviewDate": "2024-05-23T12:00:00.000Z",
  "averageResponseTime": null,
  "retentionRate": 80,
  "nextReviewIntervals": {
    "again": 1,
    "hard": 5,
    "good": 7,
    "easy": 12
  }
}
```

### 4. Варианты интервалов

```http
GET /api/theory/cards/{cardId}/intervals
```

**Ответ:**

```json
{
  "again": 1,
  "hard": 5,
  "good": 7,
  "easy": 12
}
```

### 5. Сброс прогресса

```http
POST /api/theory/cards/{cardId}/reset
```

**Ответ:**

```json
{
  "message": "Card progress reset successfully"
}
```

### 6. Общая статистика

```http
GET /api/theory/stats
```

**Ответ:**

```json
{
  "new": 150,
  "learning": 25,
  "review": 75,
  "total": 250
}
```

## Алгоритм работы

### Новая карточка (NEW)

1. **again/hard** → LEARNING (1 минута)
2. **good** → LEARNING (10 минут)
3. **easy** → REVIEW (4 дня)

### Изучение (LEARNING)

1. **again** → LEARNING (1 минута, сброс к первому шагу)
2. **hard** → LEARNING (повтор текущего шага)
3. **good** → следующий шаг или REVIEW (1 день)
4. **easy** → REVIEW (4 дня)

### Повторение (REVIEW)

1. **again** → RELEARNING (ease factor -0.20, интервал × 0.1)
2. **hard** → REVIEW (ease factor -0.15, интервал × 1.2)
3. **good** → REVIEW (интервал × ease factor)
4. **easy** → REVIEW (ease factor +0.15, интервал × ease factor × 1.3)

### Переизучение (RELEARNING)

Аналогично LEARNING, но после завершения возвращается в REVIEW с уменьшенным интервалом.

## Приоритизация карточек

Карточки сортируются по приоритету:

1. **Просрочка** - чем больше дней просрочки, тем выше приоритет
2. **Сложность** - карточки с низким ease factor имеют приоритет
3. **Забывания** - карточки с большим lapseCount имеют приоритет
4. **Состояние** - LEARNING/RELEARNING имеют максимальный приоритет

## Конфигурация

Настройки алгоритма находятся в `src/types/spacedRepetition.ts`:

```typescript
export const DEFAULT_CONFIG: SpacedRepetitionConfig = {
  learningSteps: [1, 10], // минуты
  graduatingInterval: 1, // дни
  easyInterval: 4, // дни
  minEaseFactor: 1.3,
  maxEaseFactor: 2.5,
  initialEaseFactor: 2.5,
  lapseMultiplier: 0.1,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
};
```

## Примеры использования

### Фронтенд интеграция

```javascript
// Получение карточек к повторению
const dueCards = await fetch("/api/theory/cards/due?limit=1").then((res) =>
  res.json()
);

// Показ карточки пользователю
const card = dueCards[0];
console.log(card.questionBlock);

// Получение вариантов интервалов
const intervals = await fetch(`/api/theory/cards/${card.id}/intervals`).then(
  (res) => res.json()
);

// Показ кнопок с интервалами
// "Забыл (1 мин)" "Сложно (5 дней)" "Хорошо (7 дней)" "Легко (12 дней)"

// Отправка оценки
const result = await fetch(`/api/theory/cards/${card.id}/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rating: "good" }),
}).then((res) => res.json());

console.log(`Следующее повторение: ${result.newDueDate}`);
```

### Мониторинг прогресса

```javascript
// Общая статистика
const stats = await fetch("/api/theory/stats").then((res) => res.json());
console.log(
  `Новых: ${stats.new}, Изучается: ${stats.learning}, Повторение: ${stats.review}`
);

// Детальная статистика по карточке
const cardStats = await fetch(`/api/theory/cards/${cardId}/stats`).then((res) =>
  res.json()
);
console.log(`Retention rate: ${cardStats.retentionRate}%`);
```

## Миграция данных

Существующие записи `UserTheoryProgress` автоматически получат значения по умолчанию:

- `easeFactor`: 2.50
- `interval`: 1
- `cardState`: 'NEW'
- `reviewCount`: 0
- `lapseCount`: 0

Поле `solvedCount` сохраняется для обратной совместимости.

## Swagger документация

Полная документация API доступна по адресу `/api-docs` после запуска сервера.
