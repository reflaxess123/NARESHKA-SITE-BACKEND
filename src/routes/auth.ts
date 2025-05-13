import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";

const router = Router();
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Роут для регистрации
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Сохранение ID пользователя в сессии
    req.session.userId = user.id;

    res
      .status(201)
      .json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Роут для входа
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Сравнение паролей
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Сохранение ID пользователя в сессии
    req.session.userId = user.id;

    res.status(200).json({ message: "Login successful", userId: user.id });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Роут для выхода
router.post("/logout", (req, res) => {
  const cookieName = "connect.sid"; // Имя cookie по умолчанию для express-session
  const cookieOptions: import("express-serve-static-core").CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain:
      process.env.NODE_ENV === "production" ? ".nareshka.site" : undefined,
    path: "/", // Важно указать путь
  };

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res
        .status(500)
        .json({ message: "Could not log out, please try again" });
    }
    res.clearCookie(cookieName, cookieOptions);
    res.status(200).json({ message: "Logout successful" });
  });
});

export default router;
