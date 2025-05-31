# 🔐 Документация системы ролей пользователей

## 🎯 Общее описание

Система поддерживает три роли пользователей с различными уровнями доступа:

- **🚫 GUEST** - Гость (минимальный доступ)
- **👤 USER** - Обычный пользователь (стандартный доступ)
- **👑 ADMIN** - Администратор (полный доступ)

## 🏗 Архитектура

### Роли в базе данных

```prisma
enum UserRole {
  GUEST
  USER
  ADMIN
}

model User {
  // ... другие поля
  role UserRole @default(USER)
}
```

### Иерархия ролей

```
ADMIN (уровень 2) - Полный доступ ко всем функциям
  ↓
USER (уровень 1) - Доступ к основным функциям
  ↓
GUEST (уровень 0) - Ограниченный доступ
```

---

## 🛡 Права доступа по ролям

### 🚫 GUEST (Гость)

**Доступно:**

- Просмотр публичного контента (если такой будет)
- Регистрация/авторизация

**Запрещено:**

- Доступ к защищенному контенту
- Использование чата
- Сохранение прогресса

### 👤 USER (Пользователь)

**Доступно:**

- Все функции гостя +
- Изучение контента (статьи, теория)
- Сохранение прогресса обучения
- Участие в чатах
- Просмотр своей статистики
- Обновление своего профиля

**Запрещено:**

- Доступ к админ-панели
- Управление другими пользователями
- Управление контентом

### 👑 ADMIN (Администратор)

**Доступно:**

- Все функции пользователя +
- Полный доступ к админ-панели
- Управление пользователями (CRUD)
- Просмотр статистики системы
- Управление контентом
- Мониторинг чатов

---

## 🔧 API для работы с ролями

### Получение профиля с ролью

```http
GET /api/profile
Authorization: Cookie-based session

Response:
{
  "id": 1,
  "email": "user@example.com",
  "role": "USER",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 🛠 Админ API

Все админские эндпоинты требуют роль `ADMIN`.

### 📊 Статистика системы

```http
GET /api/admin/stats
```

**Ответ:**

```json
{
  "users": {
    "total": 150,
    "admins": 2,
    "regularUsers": 148,
    "guests": 0
  },
  "content": {
    "totalFiles": 85,
    "totalBlocks": 420,
    "totalTheoryCards": 150
  },
  "chat": {
    "totalRooms": 25,
    "totalMessages": 1250
  },
  "progress": {
    "totalContentProgress": 850,
    "totalTheoryProgress": 450
  }
}
```

### 👥 Управление пользователями

#### Получить список пользователей

```http
GET /api/admin/users?page=1&limit=20&role=USER&search=john
```

**Параметры:**

- `page` - номер страницы (по умолчанию: 1)
- `limit` - количество на странице (по умолчанию: 20)
- `role` - фильтр по роли (GUEST|USER|ADMIN)
- `search` - поиск по email

#### Создать пользователя

```http
POST /api/admin/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "USER"
}
```

#### Обновить пользователя

```http
PUT /api/admin/users/123
Content-Type: application/json

{
  "email": "updated@example.com",
  "role": "ADMIN",
  "password": "newpassword123"
}
```

#### Удалить пользователя

```http
DELETE /api/admin/users/123
```

⚠️ **Ограничения:**

- Нельзя удалить самого себя
- Все связанные данные удаляются каскадно

### 📈 Статистика контента

```http
GET /api/admin/content/stats
```

**Ответ:**

```json
{
  "contentByCategory": [
    { "mainCategory": "JS", "_count": { "mainCategory": 45 } },
    { "mainCategory": "REACT", "_count": { "mainCategory": 30 } }
  ],
  "theoryByCategory": [
    { "category": "JS ТЕОРИЯ", "_count": { "category": 80 } }
  ],
  "recentFiles": [...],
  "progress": {
    "content": { "avg_content_progress": 3.5, "active_users_content": 120 },
    "theory": { "avg_theory_progress": 2.8, "active_users_theory": 95 }
  }
}
```

### 🗑 Управление контентом

#### Удалить файл контента

```http
DELETE /api/admin/content/files/{fileId}
```

---

## 🔧 Middleware для проверки ролей

### requireAdmin

Проверяет, что пользователь - администратор.

```typescript
import { requireAdmin } from "../middleware/roleMiddleware";

router.get("/admin-only", requireAdmin, (req, res) => {
  // Только для админов
});
```

### requireRole

Проверяет минимальный уровень роли.

```typescript
import { requireRole } from "../middleware/roleMiddleware";

// Только для USER и ADMIN
router.get("/users-and-admins", requireRole("USER"), (req, res) => {
  // Доступно для USER и ADMIN
});
```

### attachUserRole

Добавляет роль в запрос без блокировки.

```typescript
import { attachUserRole } from "../middleware/roleMiddleware";

router.get("/public", attachUserRole, (req, res) => {
  const userRole = req.userRole; // "GUEST" | "USER" | "ADMIN"
  // Логика в зависимости от роли
});
```

---

## 🚀 Настройка системы

### 1. Применить миграции

```bash
npm run prisma:migrate
# или
npx prisma db push
```

### 2. Сгенерировать Prisma клиент

```bash
npm run prisma:generate
```

### 3. Создать первого администратора

```bash
npm run create-admin admin@example.com password123
```

### 4. Запустить сервер

```bash
npm run dev
```

---

## 🎨 Примеры использования на фронтенде

### Проверка роли пользователя

```typescript
// После получения профиля
const profile = await fetch("/api/profile").then((r) => r.json());

switch (profile.role) {
  case "ADMIN":
    // Показать админ-панель
    showAdminPanel();
    break;
  case "USER":
    // Показать пользовательский интерфейс
    showUserInterface();
    break;
  case "GUEST":
  default:
    // Показать ограниченный интерфейс
    showGuestInterface();
    break;
}
```

### Условный рендеринг компонентов

```tsx
interface AppProps {
  userRole: "GUEST" | "USER" | "ADMIN";
}

function App({ userRole }: AppProps) {
  return (
    <div>
      <Header />

      {userRole !== "GUEST" && <ContentAccess />}
      {userRole !== "GUEST" && <ChatAccess />}
      {userRole === "ADMIN" && <AdminPanel />}

      <Footer />
    </div>
  );
}
```

### Защищенные роуты

```tsx
function ProtectedRoute({
  children,
  requiredRole,
  userRole,
}: {
  children: React.ReactNode;
  requiredRole: "USER" | "ADMIN";
  userRole: "GUEST" | "USER" | "ADMIN";
}) {
  const roleHierarchy = { GUEST: 0, USER: 1, ADMIN: 2 };

  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
```

---

## ⚠️ Безопасность

### 1. **Серверная проверка**

- Все проверки ролей выполняются на сервере
- Клиентская проверка только для UX

### 2. **Сессии**

- Роль получается из базы данных при каждом запросе
- Нет кэширования ролей в сессии

### 3. **Каскадное удаление**

- При удалении пользователя удаляются все связанные данные
- Прогресс, сообщения, участие в чатах

### 4. **Самозащита**

- Администратор не может удалить сам себя
- Требуется авторизация для всех админских операций

---

## 🔄 Миграция существующих пользователей

Все существующие пользователи автоматически получат роль `USER` благодаря значению по умолчанию в схеме Prisma.

Если нужно изменить роли существующих пользователей:

```sql
-- Сделать пользователя администратором
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';

-- Массовое обновление ролей
UPDATE "User" SET role = 'USER' WHERE role IS NULL;
```

---

## 📝 Changelog

### v1.0.0

- ✅ Добавлена система ролей (GUEST, USER, ADMIN)
- ✅ Middleware для проверки ролей
- ✅ Админ API для управления пользователями
- ✅ Статистика для администраторов
- ✅ Обновлен эндпоинт профиля
- ✅ Скрипт создания администратора
