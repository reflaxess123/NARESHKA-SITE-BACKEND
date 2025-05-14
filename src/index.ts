import { PrismaClient } from "@prisma/client";
import RedisStore from "connect-redis";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import { createClient } from "redis";
import { isAuthenticated } from "./middleware/authMiddleware";
import authRoutes from "./routes/auth";
import contentRoutes from "./routes/content";
import { updateContentFromWebDAV } from "./services/contentUpdater";
import { parseMarkdownContent } from "./utils/markdownParser";

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

app.set("trust proxy", 1); // Доверяем первому прокси (Nginx)

const corsOptions = {
  origin: ["https://nareshka.site", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
const port = process.env.PORT || 4000;

app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain:
        process.env.NODE_ENV === "production" ? ".nareshka.site" : undefined,
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

// Роуты для контента
app.use("/api/content", contentRoutes);

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

// Новый эндпоинт для чтения файлов с WebDAV
app.get("/api/webdav/list", isAuthenticated, async (req, res) => {
  const directoryPath = req.query.directoryPath as string;

  if (!directoryPath) {
    return res
      .status(400)
      .json({ message: "directoryPath query parameter is required" });
  }

  // Используем переменные окружения для URL и учетных данных
  const webDAVUrl = process.env.WEBDAV_URL;
  const webDAVUsername = process.env.WEBDAV_USERNAME;
  const webDAVPassword = process.env.WEBDAV_PASSWORD;

  if (!webDAVUrl || !webDAVUsername || !webDAVPassword) {
    console.error(
      "WebDAV credentials are not configured in environment variables."
    );
    return res
      .status(500)
      .json({ message: "WebDAV service is not configured." });
  }

  try {
    const { createClient: createWebDAVClient } = await import("webdav");
    const webDAVClient = createWebDAVClient(webDAVUrl, {
      username: webDAVUsername,
      password: webDAVPassword,
    });

    // Проверяем, существует ли директория
    if (!(await webDAVClient.exists(directoryPath))) {
      return res
        .status(404)
        .json({ message: `Directory not found: ${directoryPath}` });
    }

    // Получаем содержимое директории рекурсивно
    const webdavResponse = (await webDAVClient.getDirectoryContents(
      directoryPath,
      {
        deep: true,
      }
    )) as any; // Получаем как any, чтобы проверить структуру

    // Проверяем, что webdavResponse существует и содержит свойство data, которое является массивом
    if (
      !webdavResponse ||
      typeof webdavResponse !== "object" ||
      !Array.isArray(webdavResponse.data)
    ) {
      console.error(
        "Unexpected response structure from WebDAV for /api/webdav/list",
        webdavResponse
      );
      return res.status(500).json({
        message:
          "Failed to list directory contents due to unexpected WebDAV response format.",
      });
    }

    const items = webdavResponse.data as any[];

    // Фильтруем, чтобы оставить только файлы
    const filesOnly = items.filter((item) => item.type === "file");

    // Можно отфильтровать или смапить данные перед отправкой, если нужно
    // Например, чтобы получить только имена и типы:
    // const mappedItems = filesOnly.map(item => ({
    //   name: item.basename,
    //   type: item.type,
    //   size: item.size,
    //   lastModified: item.lastmod
    // }));

    res.status(200).json(filesOnly); // Отправляем отфильтрованный список (только файлы)
  } catch (error: any) {
    console.error(`Error listing WebDAV directory ${directoryPath}:`, error);
    // Проверяем, содержит ли ошибка информацию о статусе от WebDAV сервера
    if (error.status) {
      return res.status(error.status).json({
        message: `WebDAV error: ${error.message || "Failed to list directory"}`,
      });
    }
    res.status(500).json({
      message: "Internal server error while listing WebDAV directory",
    });
  }
});

// Эндпоинт для получения содержимого конкретного файла с WebDAV
app.get("/api/webdav/file", isAuthenticated, async (req, res) => {
  const filePath = req.query.filePath as string;

  if (!filePath) {
    return res
      .status(400)
      .json({ message: "filePath query parameter is required" });
  }

  const webDAVUrl = process.env.WEBDAV_URL;
  const webDAVUsername = process.env.WEBDAV_USERNAME;
  const webDAVPassword = process.env.WEBDAV_PASSWORD;

  if (!webDAVUrl || !webDAVUsername || !webDAVPassword) {
    console.error(
      "WebDAV credentials are not configured in environment variables."
    );
    return res
      .status(500)
      .json({ message: "WebDAV service is not configured." });
  }

  try {
    const { createClient: createWebDAVClient } = await import("webdav");
    const webDAVClient = createWebDAVClient(webDAVUrl, {
      username: webDAVUsername,
      password: webDAVPassword,
    });

    // Проверяем, существует ли файл
    if (!(await webDAVClient.exists(filePath))) {
      return res.status(404).json({ message: `File not found: ${filePath}` });
    }

    // Читаем содержимое файла
    // По умолчанию содержимое будет Buffer. Если вы ожидаете текстовый файл,
    // можно использовать webDAVClient.getFileContents(filePath, { format: "text" });
    const fileContent = await webDAVClient.getFileContents(filePath);

    // Определяем Content-Type на основе расширения файла
    let contentType = "application/octet-stream"; // По умолчанию для бинарных данных
    if (filePath.endsWith(".txt")) {
      contentType = "text/plain; charset=utf-8";
    } else if (filePath.endsWith(".md")) {
      contentType = "text/markdown; charset=utf-8";
    } else if (filePath.endsWith(".json")) {
      contentType = "application/json; charset=utf-8";
    } else if (filePath.endsWith(".xml")) {
      contentType = "application/xml; charset=utf-8";
    } // Добавьте другие типы по необходимости

    res.setHeader("Content-Type", contentType);
    res.status(200).send(fileContent);
  } catch (error: any) {
    console.error(`Error accessing WebDAV file ${filePath}:`, error);
    if (error.status) {
      return res.status(error.status).json({
        message: `WebDAV error: ${error.message || "Failed to read file"}`,
      });
    }
    res
      .status(500)
      .json({ message: "Internal server error while reading WebDAV file" });
  }
});

// Эндпоинт для тестирования парсера Markdown
app.get("/api/test-parser", isAuthenticated, async (req, res) => {
  const filePath = req.query.filePath as string;

  if (!filePath) {
    return res
      .status(400)
      .json({ message: "filePath query parameter is required" });
  }

  const webDAVUrl = process.env.WEBDAV_URL;
  const webDAVUsername = process.env.WEBDAV_USERNAME;
  const webDAVPassword = process.env.WEBDAV_PASSWORD;

  if (!webDAVUrl || !webDAVUsername || !webDAVPassword) {
    console.error(
      "WebDAV credentials are not configured in environment variables."
    );
    return res
      .status(500)
      .json({ message: "WebDAV service is not configured." });
  }

  try {
    const { createClient: createWebDAVClient } = await import("webdav");
    const webDAVClient = createWebDAVClient(webDAVUrl, {
      username: webDAVUsername,
      password: webDAVPassword,
    });

    if (!(await webDAVClient.exists(filePath))) {
      return res.status(404).json({ message: `File not found: ${filePath}` });
    }

    const fileContent = (await webDAVClient.getFileContents(filePath, {
      format: "text",
    })) as string;

    const parsedResult = await parseMarkdownContent(fileContent, filePath);

    res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error(`Error in test-parser for ${filePath}:`, error);
    if (error.status) {
      return res.status(error.status).json({
        message: `WebDAV error: ${error.message || "Failed to process file"}`,
      });
    }
    res
      .status(500)
      .json({ message: "Internal server error while testing parser" });
  }
});

// --- Новый эндпоинт для запуска обновления контента из WebDAV ---
app.post("/api/admin/update-content", isAuthenticated, async (req, res) => {
  console.log("Received request to update content from WebDAV.");
  try {
    // Возможно, вы захотите передать baseDirectoryPath из запроса,
    // но пока используем значение по умолчанию из функции.
    const summary = await updateContentFromWebDAV();

    if (summary.status.startsWith("Failed")) {
      console.error("Content update failed:", summary);
      return res.status(500).json(summary);
    }

    console.log("Content update successful:", summary);
    res.status(200).json(summary);
  } catch (error: any) {
    console.error(
      "Critical error during updateContentFromWebDAV trigger:",
      error
    );
    res.status(500).json({
      status: "Failed: Critical error in endpoint",
      message: error.message,
      errors: [{ filePath: "ENDPOINT_TRIGGER", error: error.message }],
    });
  }
});
// --- Конец нового эндпоинта ---

// НОВЫЙ ЭНДПОИНТ для иерархического списка категорий
app.get("/api/content/categories", isAuthenticated, async (req, res) => {
  try {
    const files = await prisma.contentFile.findMany({
      select: {
        mainCategory: true,
        subCategory: true,
      },
      orderBy: [{ mainCategory: "asc" }, { subCategory: "asc" }],
    });

    const hierarchyMap = new Map<string, Set<string>>();

    for (const file of files) {
      if (!hierarchyMap.has(file.mainCategory)) {
        hierarchyMap.set(file.mainCategory, new Set<string>());
      }
      hierarchyMap.get(file.mainCategory)!.add(file.subCategory);
    }

    const result = Array.from(hierarchyMap.entries()).map(
      ([mainCat, subCatSet]) => ({
        name: mainCat,
        subCategories: Array.from(subCatSet).sort(), // Подкатегории уже отсортированы из-за orderBy в запросе и Set, но для уверенности
      })
    );

    // Основные категории уже отсортированы из-за orderBy в запросе и порядка обработки Map
    res.json(result);
  } catch (error) {
    console.error("Error fetching hierarchical categories:", error);
    res.status(500).json({ error: "Failed to fetch hierarchical categories" });
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
