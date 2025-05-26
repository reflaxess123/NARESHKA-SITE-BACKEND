import { PrismaClient } from "@prisma/client";
import express from "express";
import { isAuthenticated } from "../middleware/authMiddleware";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @swagger
 * /api/content/blocks:
 *   get:
 *     summary: Получение списка блоков контента
 *     description: Возвращает список блоков контента с пагинацией, фильтрацией и поиском
 *     tags: [Content]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Количество элементов на странице
 *       - in: query
 *         name: webdavPath
 *         schema:
 *           type: string
 *         description: Часть пути к файлу WebDAV для поиска
 *         example: "SBORNICK/JS/Array"
 *       - in: query
 *         name: mainCategory
 *         schema:
 *           type: string
 *         description: Основная категория контента
 *         example: "JS"
 *       - in: query
 *         name: subCategory
 *         schema:
 *           type: string
 *         description: Подкатегория контента
 *         example: "Array"
 *       - in: query
 *         name: filePathId
 *         schema:
 *           type: string
 *         description: ID файла для фильтрации блоков
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Строка для полнотекстового поиска
 *         example: "useEffect hook"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [orderInFile, blockLevel, createdAt, updatedAt, file.webdavPath]
 *           default: orderInFile
 *         description: Поле для сортировки
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Направление сортировки
 *     responses:
 *       200:
 *         description: Список блоков контента
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentBlocksList'
 *       400:
 *         description: Неверные параметры запроса
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Пользователь не аутентифицирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/content/blocks - Получение списка блоков контента с пагинацией и фильтрацией
router.get("/blocks", isAuthenticated, async (req, res) => {
  const userId = req.session.userId; // Получаем ID текущего пользователя

  const {
    page = "1",
    limit = "10",
    webdavPath,
    mainCategory,
    subCategory,
    filePathId, // Фильтр по ID конкретного файла ContentFile
    sortBy = "orderInFile", // По умолчанию сортируем по порядку в файле
    sortOrder = "asc", // По умолчанию по возрастанию
    q, // Новый параметр для полнотекстового поиска
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return res
      .status(400)
      .json({ message: "Page number must be a positive integer." });
  }
  if (isNaN(limitNum) || limitNum < 1) {
    return res
      .status(400)
      .json({ message: "Limit must be a positive integer." });
  }

  const offset = (pageNum - 1) * limitNum;

  // Объект для фильтрации Prisma
  const where: any = {};
  const fileFilter: any = {};

  if (webdavPath) {
    fileFilter.webdavPath = {
      contains: webdavPath as string,
      mode: "insensitive",
    };
  }
  if (mainCategory) {
    fileFilter.mainCategory = {
      equals: mainCategory as string,
      mode: "insensitive",
    };
  }
  if (subCategory) {
    fileFilter.subCategory = {
      equals: subCategory as string,
      mode: "insensitive",
    };
  }
  if (filePathId) {
    fileFilter.id = filePathId as string;
  }

  // Если есть хотя бы один фильтр по ContentFile, добавляем его в 'where'
  if (Object.keys(fileFilter).length > 0) {
    where.file = fileFilter;
  }

  // Добавляем условия для полнотекстового поиска, если параметр q предоставлен
  if (q && typeof q === "string" && q.trim() !== "") {
    const searchQuery = q.trim();
    where.OR = [
      {
        blockTitle: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
      {
        textContent: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
      {
        codeFoldTitle: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
      // Можно добавить поиск по codeContent, если это необходимо
      // {
      //   codeContent: {
      //     contains: searchQuery,
      //     mode: 'insensitive',
      //   },
      // },
    ];
  }

  // Сортировка
  const orderBy: any = {};
  if (
    sortBy === "createdAt" ||
    sortBy === "updatedAt" ||
    sortBy === "blockLevel" ||
    sortBy === "orderInFile"
  ) {
    orderBy[sortBy as string] = sortOrder === "desc" ? "desc" : "asc";
  } else if (
    sortBy === "file.webdavPath" &&
    Object.keys(fileFilter).length === 0
  ) {
    // Только если не фильтруем по файлу уже
    orderBy.file = { webdavPath: sortOrder === "desc" ? "desc" : "asc" };
  } else {
    orderBy.orderInFile = "asc"; // По умолчанию, если sortBy некорректен
  }

  try {
    const blocksData = await prisma.contentBlock.findMany({
      where,
      skip: offset,
      take: limitNum,
      orderBy,
      include: {
        file: true, // Включаем данные связанного файла
        progressEntries: {
          where: { userId: userId || -1 }, // Фильтруем по текущему пользователю, -1 если юзер не залогинен
          select: { solvedCount: true },
        },
      },
    });

    const blocks = blocksData.map((block) => {
      const { progressEntries, ...restOfBlock } = block;
      return {
        ...restOfBlock,
        currentUserSolvedCount:
          progressEntries && progressEntries.length > 0
            ? progressEntries[0].solvedCount
            : 0,
      };
    });

    const totalBlocks = await prisma.contentBlock.count({
      where,
    });

    res.status(200).json({
      data: blocks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: totalBlocks,
        totalPages: Math.ceil(totalBlocks / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching content blocks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/content/blocks/{id}:
 *   get:
 *     summary: Получение конкретного блока контента
 *     description: Возвращает детальную информацию о блоке контента по его ID
 *     tags: [Content]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID блока контента
 *     responses:
 *       200:
 *         description: Блок контента найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentBlock'
 *       401:
 *         description: Пользователь не аутентифицирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Блок контента не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/content/blocks/:id - Получение конкретного блока контента по ID
router.get("/blocks/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId; // Получаем ID текущего пользователя

  try {
    const blockData = await prisma.contentBlock.findUnique({
      where: { id },
      include: {
        file: true, // Включаем данные связанного файла
        progressEntries: {
          where: { userId: userId || -1 }, // Фильтруем по текущему пользователю
          select: { solvedCount: true },
        },
      },
    });

    if (!blockData) {
      return res.status(404).json({ message: "Content block not found" });
    }

    const { progressEntries, ...restOfBlockData } = blockData;
    const block = {
      ...restOfBlockData,
      currentUserSolvedCount:
        progressEntries && progressEntries.length > 0
          ? progressEntries[0].solvedCount
          : 0,
    };

    res.status(200).json(block);
  } catch (error) {
    console.error(`Error fetching content block ${id}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/content/blocks/{blockId}/progress:
 *   patch:
 *     summary: Обновление прогресса пользователя по блоку
 *     description: Увеличивает или уменьшает счетчик решений для блока контента
 *     tags: [Content]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID блока контента
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentProgressUpdate'
 *           examples:
 *             increment:
 *               summary: Увеличить счетчик
 *               value:
 *                 action: "increment"
 *             decrement:
 *               summary: Уменьшить счетчик
 *               value:
 *                 action: "decrement"
 *     responses:
 *       200:
 *         description: Прогресс успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentProgressResponse'
 *       400:
 *         description: Неверное действие
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Пользователь не аутентифицирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Блок контента не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Ошибка при обновлении прогресса
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PATCH /api/content/blocks/:blockId/progress - Обновление прогресса пользователя по блоку
router.patch("/blocks/:blockId/progress", isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { blockId } = req.params;
  const { action } = req.body; // "increment" or "decrement"

  if (!userId) {
    // Это не должно произойти из-за isAuthenticated, но на всякий случай
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (action !== "increment" && action !== "decrement") {
    return res
      .status(400)
      .json({ message: "Invalid action. Must be 'increment' or 'decrement'." });
  }

  try {
    let updatedProgress;

    if (action === "increment") {
      updatedProgress = await prisma.userContentProgress.upsert({
        where: { userId_blockId: { userId, blockId } },
        create: { userId, blockId, solvedCount: 1 },
        update: { solvedCount: { increment: 1 } },
        select: { userId: true, blockId: true, solvedCount: true },
      });
    } else {
      // action === "decrement"
      // Сначала пытаемся уменьшить, если solvedCount > 0
      await prisma.userContentProgress.updateMany({
        where: {
          userId: userId,
          blockId: blockId,
          solvedCount: { gt: 0 },
        },
        data: {
          solvedCount: { decrement: 1 },
        },
      });

      // Затем получаем или создаем (с solvedCount: 0) запись, чтобы вернуть актуальное состояние
      updatedProgress = await prisma.userContentProgress.upsert({
        where: { userId_blockId: { userId, blockId } },
        create: { userId, blockId, solvedCount: 0 }, // Если не существовала, создаем с 0
        update: {}, // Если существовала, updateMany уже сделал работу или solvedCount был 0
        select: { userId: true, blockId: true, solvedCount: true },
      });
    }
    res.status(200).json(updatedProgress);
  } catch (error: any) {
    console.error(
      `Error updating progress for block ${blockId} and user ${userId}:`,
      error
    );
    // Проверка на Prisma specific errors, если нужно (например, если blockId не существует)
    if (error && error.code === "P2025") {
      return res.status(404).json({
        message:
          "Content block not found or user progress record inconsistency.",
      });
    }
    res.status(500).json({ message: "Failed to update content progress" });
  }
});

export default router;
