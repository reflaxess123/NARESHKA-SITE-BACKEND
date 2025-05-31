import express from "express";
import { isAuthenticated } from "../middleware/authMiddleware";
import { ChatService } from "../services/chatService";

const router = express.Router();
const chatService = new ChatService();

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatRoom:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [PRIVATE, GROUP]
 *         isActive:
 *           type: boolean
 *         createdBy:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChatParticipant'
 *         lastMessage:
 *           $ref: '#/components/schemas/ChatMessage'
 *         unreadCount:
 *           type: integer
 *
 *     ChatMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         roomId:
 *           type: string
 *         senderId:
 *           type: integer
 *         content:
 *           type: string
 *         messageType:
 *           type: string
 *           enum: [TEXT, IMAGE, FILE, SYSTEM]
 *         isEdited:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         sender:
 *           $ref: '#/components/schemas/ChatUser'
 *         replyTo:
 *           $ref: '#/components/schemas/ChatMessage'
 *
 *     ChatUser:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         isOnline:
 *           type: boolean
 *
 *     ChatParticipant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: integer
 *         user:
 *           $ref: '#/components/schemas/ChatUser'
 *         joinedAt:
 *           type: string
 *           format: date-time
 *         lastReadAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/chat/rooms:
 *   get:
 *     summary: Получить все комнаты пользователя
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Список комнат
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatRoom'
 */
router.get("/rooms", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const rooms = await chatService.getUserRooms(userId);
    res.json(rooms);
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/chat/rooms:
 *   post:
 *     summary: Создать новую комнату
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantIds
 *               - type
 *             properties:
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PRIVATE, GROUP]
 *     responses:
 *       201:
 *         description: Комната создана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatRoom'
 */
router.post("/rooms", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { participantIds, name, type } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || !type) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const room = await chatService.createRoom(userId, {
      participantIds,
      name,
      type,
    });

    res.status(201).json(room);
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/chat/rooms/{roomId}/messages:
 *   get:
 *     summary: Получить сообщения комнаты
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Список сообщений
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
 */
router.get("/rooms/:roomId/messages", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { roomId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await chatService.getRoomMessages(
      roomId,
      userId,
      page,
      limit
    );
    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    if (error instanceof Error && error.message === "Access denied") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/chat/rooms/{roomId}/read:
 *   post:
 *     summary: Отметить сообщения как прочитанные
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Сообщения отмечены как прочитанные
 */
router.post("/rooms/:roomId/read", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { roomId } = req.params;

    await chatService.markAsRead(userId, roomId);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/chat/users:
 *   get:
 *     summary: Получить список всех пользователей
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatUser'
 */
router.get("/users", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const users = await chatService.getAllUsers(userId);
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   delete:
 *     summary: Удалить сообщение
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Сообщение удалено
 */
router.delete("/messages/:messageId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { messageId } = req.params;

    await chatService.deleteMessage(messageId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete message error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return res
        .status(404)
        .json({ message: "Message not found or access denied" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   put:
 *     summary: Редактировать сообщение
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Сообщение отредактировано
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatMessage'
 */
router.put("/messages/:messageId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ message: "Content is required" });
    }

    const message = await chatService.editMessage(messageId, userId, content);
    res.json(message);
  } catch (error) {
    console.error("Edit message error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return res
        .status(404)
        .json({ message: "Message not found or access denied" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
