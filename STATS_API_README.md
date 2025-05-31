# Statistics API Documentation

## Обзор

Statistics API предоставляет детальную статистику прогресса пользователя по контент-блокам и теоретическим карточкам. Идеально подходит для создания роадмапов и дашбордов прогресса.

**Базовый URL:** `/api/stats`

**Аутентификация:** Все endpoints требуют аутентификации через cookie сессии.

---

## Endpoints

### 1. Общая статистика пользователя

**GET** `/api/stats/overview`

Возвращает общую статистику прогресса пользователя по всем категориям контента и теории.

#### Пример запроса

```javascript
GET / api / stats / overview;
```

#### Response

```typescript
interface UserStats {
  userId: number;
  totalContentBlocks: number;
  solvedContentBlocks: number;
  totalTheoryCards: number;
  reviewedTheoryCards: number;
  contentProgress: Record<string, CategoryProgress>;
  theoryProgress: Record<string, CategoryProgress>;
  overallProgress: OverallProgress;
}

interface CategoryProgress {
  total: number;
  completed: number;
  percentage: number;
  subCategories: Record<
    string,
    {
      total: number;
      completed: number;
      percentage: number;
    }
  >;
}

interface OverallProgress {
  totalItems: number;
  completedItems: number;
  percentage: number;
  contentPercentage: number;
  theoryPercentage: number;
}
```

#### Пример ответа

```json
{
  "userId": 123,
  "totalContentBlocks": 245,
  "solvedContentBlocks": 156,
  "totalTheoryCards": 89,
  "reviewedTheoryCards": 67,
  "contentProgress": {
    "JS": {
      "total": 120,
      "completed": 85,
      "percentage": 71,
      "subCategories": {
        "Array": {
          "total": 25,
          "completed": 20,
          "percentage": 80
        },
        "Object": {
          "total": 30,
          "completed": 25,
          "percentage": 83
        }
      }
    },
    "REACT": {
      "total": 95,
      "completed": 45,
      "percentage": 47,
      "subCategories": {
        "Hooks": {
          "total": 40,
          "completed": 25,
          "percentage": 63
        },
        "Components": {
          "total": 35,
          "completed": 15,
          "percentage": 43
        }
      }
    }
  },
  "theoryProgress": {
    "JS ТЕОРИЯ": {
      "total": 45,
      "completed": 35,
      "percentage": 78,
      "subCategories": {
        "Операторы": {
          "total": 15,
          "completed": 12,
          "percentage": 80
        },
        "Область видимости": {
          "total": 20,
          "completed": 18,
          "percentage": 90
        }
      }
    }
  },
  "overallProgress": {
    "totalItems": 334,
    "completedItems": 223,
    "percentage": 67,
    "contentPercentage": 64,
    "theoryPercentage": 75
  }
}
```

---

### 2. Детальная статистика по контенту

**GET** `/api/stats/content`

Возвращает подробную статистику прогресса пользователя по контент-блокам с возможностью фильтрации.

#### Query Parameters

| Параметр        | Тип     | Описание                                      |
| --------------- | ------- | --------------------------------------------- |
| `category`      | string  | Фильтр по основной категории (например, "JS") |
| `includeBlocks` | boolean | Включить детальную информацию о блоках        |

#### Примеры запросов

```javascript
// Общая статистика по всему контенту
GET /api/stats/content

// Статистика только по JavaScript
GET /api/stats/content?category=JS

// Статистика с детальной информацией о блоках
GET /api/stats/content?category=REACT&includeBlocks=true
```

#### Response

```typescript
interface DetailedContentStats {
  categories: Record<string, DetailedCategoryStats>;
  totalBlocks: number;
  solvedBlocks: number;
  averageSolveCount: number;
}

interface DetailedCategoryStats {
  total: number;
  solved: number;
  percentage: number;
  averageSolveCount: number;
  subCategories: Record<
    string,
    {
      total: number;
      solved: number;
      percentage: number;
      averageSolveCount: number;
      blocks?: Array<{
        id: string;
        title: string;
        solveCount: number;
        isSolved: boolean;
      }>;
    }
  >;
}
```

#### Пример ответа

```json
{
  "categories": {
    "JS": {
      "total": 120,
      "solved": 85,
      "percentage": 71,
      "averageSolveCount": 2.3,
      "subCategories": {
        "Array": {
          "total": 25,
          "solved": 20,
          "percentage": 80,
          "averageSolveCount": 3.1,
          "blocks": [
            {
              "id": "clx123",
              "title": "Array.map()",
              "solveCount": 5,
              "isSolved": true
            },
            {
              "id": "clx124",
              "title": "Array.filter()",
              "solveCount": 0,
              "isSolved": false
            }
          ]
        }
      }
    }
  },
  "totalBlocks": 120,
  "solvedBlocks": 85,
  "averageSolveCount": 2.3
}
```

---

### 3. Детальная статистика по теории

**GET** `/api/stats/theory`

Возвращает подробную статистику прогресса пользователя по теоретическим карточкам.

#### Query Parameters

| Параметр       | Тип     | Описание                                    |
| -------------- | ------- | ------------------------------------------- |
| `category`     | string  | Фильтр по категории (например, "JS ТЕОРИЯ") |
| `includeCards` | boolean | Включить детальную информацию о карточках   |

#### Примеры запросов

```javascript
// Общая статистика по всей теории
GET /api/stats/theory

// Статистика только по JS теории
GET /api/stats/theory?category=JS%20ТЕОРИЯ

// Статистика с детальной информацией о карточках
GET /api/stats/theory?includeCards=true
```

#### Response

```typescript
interface DetailedTheoryStats {
  categories: Record<
    string,
    {
      total: number;
      reviewed: number;
      percentage: number;
      averageReviewCount: number;
      cardStates: {
        NEW: number;
        LEARNING: number;
        REVIEW: number;
        RELEARNING: number;
      };
      subCategories: Record<
        string,
        {
          total: number;
          reviewed: number;
          percentage: number;
          averageReviewCount: number;
          cardStates: {
            NEW: number;
            LEARNING: number;
            REVIEW: number;
            RELEARNING: number;
          };
          cards?: Array<{
            id: string;
            reviewCount: number;
            cardState: string;
            isReviewed: boolean;
            easeFactor: number;
            interval: number;
            dueDate?: string;
          }>;
        }
      >;
    }
  >;
  totalCards: number;
  reviewedCards: number;
  averageReviewCount: number;
}
```

#### Пример ответа

```json
{
  "categories": {
    "JS ТЕОРИЯ": {
      "total": 45,
      "reviewed": 35,
      "percentage": 78,
      "averageReviewCount": 4.2,
      "cardStates": {
        "NEW": 10,
        "LEARNING": 5,
        "REVIEW": 25,
        "RELEARNING": 5
      },
      "subCategories": {
        "Операторы": {
          "total": 15,
          "reviewed": 12,
          "percentage": 80,
          "averageReviewCount": 5.1,
          "cardStates": {
            "NEW": 3,
            "LEARNING": 2,
            "REVIEW": 8,
            "RELEARNING": 2
          },
          "cards": [
            {
              "id": "clx456",
              "reviewCount": 8,
              "cardState": "REVIEW",
              "isReviewed": true,
              "easeFactor": 2.8,
              "interval": 14,
              "dueDate": "2024-02-01T10:00:00.000Z"
            }
          ]
        }
      }
    }
  },
  "totalCards": 45,
  "reviewedCards": 35,
  "averageReviewCount": 4.2
}
```

---

### 4. Статистика для роадмапа

**GET** `/api/stats/roadmap`

Возвращает агрегированную статистику, оптимизированную для отображения в роадмапе. Показывает прогресс по всем категориям и подкатегориям.

#### Пример запроса

```javascript
GET / api / stats / roadmap;
```

#### Response

```typescript
interface RoadmapStats {
  categories: Array<{
    name: string;
    contentProgress: number;
    theoryProgress: number;
    overallProgress: number;
    contentStats: {
      total: number;
      completed: number;
    };
    theoryStats: {
      total: number;
      completed: number;
    };
    subCategories: Array<{
      name: string;
      contentProgress: number;
      theoryProgress: number;
      overallProgress: number;
    }>;
  }>;
}
```

#### Пример ответа

```json
{
  "categories": [
    {
      "name": "JS",
      "contentProgress": 71,
      "theoryProgress": 78,
      "overallProgress": 73,
      "contentStats": {
        "total": 120,
        "completed": 85
      },
      "theoryStats": {
        "total": 45,
        "completed": 35
      },
      "subCategories": [
        {
          "name": "Array",
          "contentProgress": 80,
          "theoryProgress": 85,
          "overallProgress": 82
        },
        {
          "name": "Object",
          "contentProgress": 83,
          "theoryProgress": 70,
          "overallProgress": 78
        },
        {
          "name": "Операторы",
          "contentProgress": 0,
          "theoryProgress": 80,
          "overallProgress": 80
        }
      ]
    },
    {
      "name": "REACT",
      "contentProgress": 47,
      "theoryProgress": 0,
      "overallProgress": 47,
      "contentStats": {
        "total": 95,
        "completed": 45
      },
      "theoryStats": {
        "total": 0,
        "completed": 0
      },
      "subCategories": [
        {
          "name": "Hooks",
          "contentProgress": 63,
          "theoryProgress": 0,
          "overallProgress": 63
        },
        {
          "name": "Components",
          "contentProgress": 43,
          "theoryProgress": 0,
          "overallProgress": 43
        }
      ]
    }
  ]
}
```

---

## Использование на фронтенде

### Пример компонента роадмапа

```typescript
import { useState, useEffect } from "react";

interface RoadmapCategory {
  name: string;
  contentProgress: number;
  theoryProgress: number;
  overallProgress: number;
  contentStats: { total: number; completed: number };
  theoryStats: { total: number; completed: number };
  subCategories: Array<{
    name: string;
    contentProgress: number;
    theoryProgress: number;
    overallProgress: number;
  }>;
}

const Roadmap: React.FC = () => {
  const [categories, setCategories] = useState<RoadmapCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmapData = async () => {
      try {
        const response = await fetch("/api/stats/roadmap", {
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch roadmap data");

        const data = await response.json();
        setCategories(data.categories);
      } catch (error) {
        console.error("Error fetching roadmap:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmapData();
  }, []);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 60) return "bg-yellow-500";
    if (progress >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) return <div>Загрузка роадмапа...</div>;

  return (
    <div className="roadmap">
      <h1>Мой прогресс обучения</h1>

      {categories.map((category) => (
        <div key={category.name} className="category-card">
          <div className="category-header">
            <h2>{category.name}</h2>
            <div className="progress-summary">
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getProgressColor(
                    category.overallProgress
                  )}`}
                  style={{ width: `${category.overallProgress}%` }}
                />
              </div>
              <span>{category.overallProgress}%</span>
            </div>
          </div>

          <div className="stats-summary">
            <div className="stat">
              <span>
                Контент: {category.contentStats.completed}/
                {category.contentStats.total}
              </span>
              <span>({category.contentProgress}%)</span>
            </div>
            <div className="stat">
              <span>
                Теория: {category.theoryStats.completed}/
                {category.theoryStats.total}
              </span>
              <span>({category.theoryProgress}%)</span>
            </div>
          </div>

          <div className="subcategories">
            {category.subCategories.map((subCat) => (
              <div key={subCat.name} className="subcategory">
                <span className="subcategory-name">{subCat.name}</span>
                <div className="subcategory-progress">
                  <div className="mini-progress-bar">
                    <div
                      className={`mini-progress-fill ${getProgressColor(
                        subCat.overallProgress
                      )}`}
                      style={{ width: `${subCat.overallProgress}%` }}
                    />
                  </div>
                  <span>{subCat.overallProgress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Пример хука для работы со статистикой

```typescript
import { useState, useCallback } from "react";

export const useStatsAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats/overview", {
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

  const fetchContentStats = useCallback(
    async (
      params: {
        category?: string;
        includeBlocks?: boolean;
      } = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        if (params.category) searchParams.append("category", params.category);
        if (params.includeBlocks) searchParams.append("includeBlocks", "true");

        const response = await fetch(`/api/stats/content?${searchParams}`, {
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

  const fetchTheoryStats = useCallback(
    async (
      params: {
        category?: string;
        includeCards?: boolean;
      } = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        if (params.category) searchParams.append("category", params.category);
        if (params.includeCards) searchParams.append("includeCards", "true");

        const response = await fetch(`/api/stats/theory?${searchParams}`, {
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

  const fetchRoadmapStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats/roadmap", {
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
    fetchOverview,
    fetchContentStats,
    fetchTheoryStats,
    fetchRoadmapStats,
  };
};
```

### Пример дашборда прогресса

```typescript
import { useState, useEffect } from "react";
import { useStatsAPI } from "./useStatsAPI";

const ProgressDashboard: React.FC = () => {
  const { fetchOverview, loading, error } = useStatsAPI();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchOverview();
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    };

    loadStats();
  }, [fetchOverview]);

  if (loading) return <div>Загрузка статистики...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!stats) return <div>Нет данных</div>;

  return (
    <div className="dashboard">
      <h1>Дашборд прогресса</h1>

      <div className="overview-cards">
        <div className="card">
          <h3>Общий прогресс</h3>
          <div className="big-number">{stats.overallProgress.percentage}%</div>
          <p>
            {stats.overallProgress.completedItems} из{" "}
            {stats.overallProgress.totalItems}
          </p>
        </div>

        <div className="card">
          <h3>Контент</h3>
          <div className="big-number">
            {stats.overallProgress.contentPercentage}%
          </div>
          <p>
            {stats.solvedContentBlocks} из {stats.totalContentBlocks}
          </p>
        </div>

        <div className="card">
          <h3>Теория</h3>
          <div className="big-number">
            {stats.overallProgress.theoryPercentage}%
          </div>
          <p>
            {stats.reviewedTheoryCards} из {stats.totalTheoryCards}
          </p>
        </div>
      </div>

      <div className="categories-grid">
        {Object.entries(stats.contentProgress).map(
          ([category, progress]: [string, any]) => (
            <div key={category} className="category-card">
              <h4>{category}</h4>
              <div className="progress-circle">
                <span>{progress.percentage}%</span>
              </div>
              <p>
                {progress.completed} из {progress.total}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
```

---

## Рекомендации по использованию

1. **Кэширование**: Кэшируйте результаты статистики, особенно для роадмапа
2. **Обновление**: Обновляйте статистику после изменения прогресса пользователя
3. **Производительность**: Используйте параметры фильтрации для больших объемов данных
4. **Визуализация**: Используйте прогресс-бары и цветовое кодирование для лучшего UX
5. **Детализация**: Используйте `includeBlocks` и `includeCards` только когда нужна детальная информация

---

## Коды ошибок

- **401 Unauthorized** - Пользователь не аутентифицирован
- **500 Internal Server Error** - Внутренняя ошибка сервера

Формат ошибки:

```json
{
  "message": "Описание ошибки"
}
```
