import { PrismaClient } from "@prisma/client";
import RedisStore from "connect-redis";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import { createClient } from "redis";
import { isAuthenticated } from "./middleware/authMiddleware";
import authRoutes from "./routes/auth";

dotenv.config();

const prisma = new PrismaClient();
const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.connect().catch(console.error);

const redisStore = new RedisStore({
  client: redisClient,
  prefix: "myapp:", // Префикс для ключей сессий в Redis
});

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
const port = process.env.PORT || 3000;

app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: "none",
    },
  })
);

app.use(express.json());

// Базовый роут
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Роуты для аутентификации
app.use("/auth", authRoutes);

// Пример защищенного роута
app.get("/api/profile", isAuthenticated, async (req, res) => {
  // Если мы здесь, значит middleware isAuthenticated пропустил запрос (пользователь аутентифицирован)
  const userId = req.session.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, id: true, createdAt: true }, // Выбираем только нужные поля
    });

    if (!user) {
      // Это не должно произойти, если сессия валидна, но лучше проверить
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Обработка завершения работы
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});
