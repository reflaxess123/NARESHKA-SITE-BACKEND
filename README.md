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

## Настройка и запуск

1.  **Клонируйте репозиторий:**

    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Установите зависимости:**

    ```bash
    npm install
    ```

3.  **Настройте переменные окружения:**

    - Скопируйте файл `.env.example` в `.env` (если есть `.env.example`, иначе создайте `.env`).
    - Заполните файл `.env` вашими данными:

      ```dotenv
      # PostgreSQL
      DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

      # Redis
      REDIS_URL="redis://localhost:6379"

      # Session
      SESSION_SECRET="your_strong_session_secret" # Сгенерируйте надежный секрет

      # Server
      PORT=3000
      ```

      - **Важно:** Замените `user`, `password` и `mydb` на реальные учетные данные и имя базы данных, которые вы указали (или оставили по умолчанию) в `docker-compose.yml`.
      - **Важно:** Замените `your_strong_session_secret` на действительно случайную и длинную строку.

4.  **Запустите Docker контейнеры:**

    - Убедитесь, что Docker Desktop запущен.
    - Выполните команду:
      ```bash
      docker-compose up -d
      ```
      Эта команда запустит контейнеры PostgreSQL и Redis в фоновом режиме.

5.  **Примените миграции базы данных:**

    ```bash
    npx prisma migrate dev --name init
    ```

    Эта команда создаст таблицы в базе данных согласно схеме Prisma (`prisma/schema.prisma`).

6.  **Запустите приложение:**
    - **В режиме разработки (с автоматической перезагрузкой при изменениях):**
      ```bash
      npm run dev
      ```
    - **Для продакшена (сначала нужно сбилдить проект):**
      ```bash
      npm run build
      npm start
      ```

Сервер будет доступен по адресу `http://localhost:3000` (или на порту, указанном в `.env`).

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
