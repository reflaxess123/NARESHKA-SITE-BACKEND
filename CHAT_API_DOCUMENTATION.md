# 📝 Документация API системы чатов

## 🎯 Общее описание

Система чатов поддерживает:

- **Приватные чаты** между двумя пользователями
- **Групповые чаты** с множеством участников
- **Real-time сообщения** через WebSocket
- **Ответы на сообщения** (reply)
- **Редактирование и удаление** сообщений
- **Отметки о прочтении** сообщений
- **Системные уведомления** (присоединение/покидание)

## 🚀 Быстрый старт

### 1. Аутентификация

Все API эндпоинты требуют аутентификации через cookie-сессии.

### 2. Подключение к WebSocket

```javascript
const socket = io("http://localhost:4000", {
  withCredentials: true, // Для передачи cookies
});
```

---

## 📊 Структуры данных

### ChatRoom

```typescript
interface ChatRoom {
  id: string; // Уникальный ID комнаты
  name?: string; // Название (для групповых чатов)
  type: "PRIVATE" | "GROUP"; // Тип чата
  isActive: boolean; // Активна ли комната
  createdBy: number; // ID создателя
  createdAt: Date; // Дата создания
  updatedAt: Date; // Последнее обновление
  participants: ChatParticipant[]; // Участники
  lastMessage?: ChatMessage; // Последнее сообщение
  unreadCount?: number; // Количество непрочитанных
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string; // Уникальный ID сообщения
  roomId: string; // ID комнаты
  senderId: number; // ID отправителя
  sender: ChatUser; // Данные отправителя
  content: string; // Текст сообщения
  messageType: "TEXT" | "IMAGE" | "FILE" | "SYSTEM"; // Тип сообщения
  isEdited: boolean; // Было ли отредактировано
  isDeleted: boolean; // Удалено ли
  createdAt: Date; // Дата создания
  updatedAt: Date; // Дата изменения
  replyToId?: string; // ID сообщения для ответа
  replyTo?: ChatMessage; // Данные сообщения для ответа
}
```

### ChatUser

```typescript
interface ChatUser {
  id: number; // ID пользователя
  email: string; // Email пользователя
  isOnline?: boolean; // Онлайн ли пользователь
  lastSeen?: Date; // Последняя активность
}
```

### ChatParticipant

```typescript
interface ChatParticipant {
  id: string; // ID участника
  roomId: string; // ID комнаты
  userId: number; // ID пользователя
  user: ChatUser; // Данные пользователя
  joinedAt: Date; // Дата присоединения
  lastReadAt?: Date; // Время последнего прочтения
  isActive: boolean; // Активен ли участник
}
```

---

## 🛠 REST API

### Базовый URL

```
http://localhost:4000/api/chat
```

### 🏠 Комнаты

#### Получить все комнаты пользователя

```http
GET /api/chat/rooms
```

**Ответ:**

```json
[
  {
    "id": "cm123...",
    "name": "Рабочий чат",
    "type": "GROUP",
    "isActive": true,
    "createdBy": 1,
    "participants": [...],
    "lastMessage": {...},
    "unreadCount": 3
  }
]
```

#### Создать новую комнату

```http
POST /api/chat/rooms
Content-Type: application/json

{
  "participantIds": [2, 3, 4],
  "name": "Новый проект",
  "type": "GROUP"
}
```

**Для приватного чата:**

```json
{
  "participantIds": [2],
  "type": "PRIVATE"
}
```

### 💬 Сообщения

#### Получить сообщения комнаты

```http
GET /api/chat/rooms/{roomId}/messages?page=1&limit=50
```

**Параметры:**

- `page` (необязательный) - номер страницы (по умолчанию: 1)
- `limit` (необязательный) - количество сообщений (по умолчанию: 50)

#### Отметить сообщения как прочитанные

```http
POST /api/chat/rooms/{roomId}/read
```

#### Удалить сообщение

```http
DELETE /api/chat/messages/{messageId}
```

#### Редактировать сообщение

```http
PUT /api/chat/messages/{messageId}
Content-Type: application/json

{
  "content": "Исправленный текст"
}
```

### 👥 Пользователи

#### Получить список всех пользователей

```http
GET /api/chat/users
```

---

## 🔌 WebSocket события

### Подключение

```javascript
const socket = io("http://localhost:4000", {
  withCredentials: true,
});

// Слушать подключение
socket.on("connect", () => {
  console.log("Подключен к чату");
});
```

### 📤 События клиент → сервер

#### Присоединиться к комнате

```javascript
socket.emit("join_room", roomId);
```

#### Покинуть комнату

```javascript
socket.emit("leave_room", roomId);
```

#### Отправить сообщение

```javascript
socket.emit("send_message", {
  roomId: "cm123...",
  content: "Привет всем!",
  messageType: "TEXT",
  replyToId: "cm456...", // Необязательно
});
```

#### Отметить как прочитанное

```javascript
socket.emit("mark_as_read", roomId);
```

#### Начать печатать

```javascript
socket.emit("typing_start", roomId);
```

#### Закончить печатать

```javascript
socket.emit("typing_stop", roomId);
```

### 📥 События сервер → клиент

#### Получено новое сообщение

```javascript
socket.on("message_received", (message) => {
  console.log("Новое сообщение:", message);
});
```

#### Сообщение обновлено

```javascript
socket.on("message_updated", (message) => {
  console.log("Сообщение изменено:", message);
});
```

#### Сообщение удалено

```javascript
socket.on("message_deleted", (messageId, roomId) => {
  console.log("Сообщение удалено:", messageId);
});
```

#### Пользователь присоединился

```javascript
socket.on("user_joined", (user, roomId) => {
  console.log("Пользователь присоединился:", user.email);
});
```

#### Пользователь покинул чат

```javascript
socket.on("user_left", (userId, roomId) => {
  console.log("Пользователь покинул чат:", userId);
});
```

#### Пользователь печатает

```javascript
socket.on("user_typing", (userId, roomId) => {
  console.log("Пользователь печатает:", userId);
});

socket.on("user_stopped_typing", (userId, roomId) => {
  console.log("Пользователь закончил печатать:", userId);
});
```

#### Комната обновлена

```javascript
socket.on("room_updated", (room) => {
  console.log("Комната обновлена:", room);
});
```

#### Ошибка

```javascript
socket.on("error", (error) => {
  console.error("Ошибка:", error.message);
});
```

---

## 💡 Примеры использования

### Создание приватного чата

```javascript
// 1. Получить список пользователей
const users = await fetch("/api/chat/users").then((r) => r.json());

// 2. Создать приватный чат
const room = await fetch("/api/chat/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    participantIds: [users[0].id],
    type: "PRIVATE",
  }),
}).then((r) => r.json());

// 3. Присоединиться к комнате через WebSocket
socket.emit("join_room", room.id);
```

### Создание группового чата

```javascript
const groupRoom = await fetch("/api/chat/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    participantIds: [2, 3, 4, 5],
    name: "Команда разработки",
    type: "GROUP",
  }),
}).then((r) => r.json());
```

### Отправка сообщения с ответом

```javascript
// Отправить ответ на сообщение
socket.emit("send_message", {
  roomId: "cm123...",
  content: "Согласен с предыдущим сообщением",
  messageType: "TEXT",
  replyToId: "cm456...", // ID сообщения на которое отвечаем
});
```

### Полный пример чата

```javascript
class ChatClient {
  constructor() {
    this.socket = io("http://localhost:4000", {
      withCredentials: true,
    });
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Подключение установлено
    this.socket.on("connect", () => {
      console.log("Подключен к чату");
      this.loadRooms();
    });

    // Новое сообщение
    this.socket.on("message_received", (message) => {
      this.displayMessage(message);
      this.updateLastMessage(message.roomId, message);
    });

    // Пользователь печатает
    this.socket.on("user_typing", (userId, roomId) => {
      this.showTypingIndicator(userId, roomId);
    });

    this.socket.on("user_stopped_typing", (userId, roomId) => {
      this.hideTypingIndicator(userId, roomId);
    });
  }

  async loadRooms() {
    const rooms = await fetch("/api/chat/rooms").then((r) => r.json());
    this.displayRooms(rooms);
  }

  joinRoom(roomId) {
    this.socket.emit("join_room", roomId);
    this.loadMessages(roomId);
  }

  async loadMessages(roomId) {
    const messages = await fetch(`/api/chat/rooms/${roomId}/messages`).then(
      (r) => r.json()
    );
    this.displayMessages(messages);
  }

  sendMessage(roomId, content, replyToId = null) {
    this.socket.emit("send_message", {
      roomId,
      content,
      messageType: "TEXT",
      replyToId,
    });
  }

  startTyping(roomId) {
    this.socket.emit("typing_start", roomId);
  }

  stopTyping(roomId) {
    this.socket.emit("typing_stop", roomId);
  }

  markAsRead(roomId) {
    this.socket.emit("mark_as_read", roomId);
  }

  // Методы отображения (зависят от UI фреймворка)
  displayRooms(rooms) {
    /* ... */
  }
  displayMessages(messages) {
    /* ... */
  }
  displayMessage(message) {
    /* ... */
  }
  updateLastMessage(roomId, message) {
    /* ... */
  }
  showTypingIndicator(userId, roomId) {
    /* ... */
  }
  hideTypingIndicator(userId, roomId) {
    /* ... */
  }
}

// Использование
const chat = new ChatClient();
```

---

## ⚠️ Важные особенности

### 1. **Проверка доступа**

- Пользователь может читать сообщения только в тех комнатах, где он участник
- Удалять и редактировать можно только свои сообщения

### 2. **Приватные чаты**

- При создании приватного чата система проверяет, не существует ли уже чат между этими пользователями
- Если существует, возвращается существующий чат

### 3. **Системные сообщения**

- Автоматически создаются при присоединении/покидании пользователей
- Имеют тип `SYSTEM`

### 4. **Пагинация**

- Сообщения загружаются с пагинацией (по умолчанию 50 сообщений на страницу)
- Сортировка по дате создания (новые сверху)

### 5. **Real-time обновления**

- Все изменения (новые сообщения, редактирование, удаление) транслируются через WebSocket
- Индикаторы печати работают в реальном времени

---

## 🔧 Коды ошибок

| Код | Описание                              |
| --- | ------------------------------------- |
| 400 | Неверные данные запроса               |
| 401 | Не авторизован                        |
| 403 | Доступ запрещен (не участник комнаты) |
| 404 | Сообщение/комната не найдены          |
| 500 | Внутренняя ошибка сервера             |

---

## 🎨 Рекомендации по UI/UX

### 1. **Список комнат**

- Показывать последнее сообщение
- Отображать количество непрочитанных
- Сортировать по времени последнего сообщения

### 2. **Чат**

- Индикатор печати для других пользователей
- Отметки о прочтении сообщений
- Возможность ответить на сообщение

### 3. **Группы**

- Показывать список участников
- Возможность добавления новых участников
- Системные уведомления о изменениях

### 4. **Производительность**

- Виртуализация списка сообщений для больших чатов
- Ленивая загрузка истории сообщений
- Дебаунс для индикатора печати
