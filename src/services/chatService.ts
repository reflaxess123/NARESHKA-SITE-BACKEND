import { PrismaClient } from "@prisma/client";
import {
  ChatRoom,
  ChatMessage,
  CreateRoomRequest,
  ChatUser,
} from "../types/chat";

const prisma = new PrismaClient();

export class ChatService {
  // Получить все комнаты пользователя
  async getUserRooms(userId: number): Promise<ChatRoom[]> {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
            isActive: true,
          },
        },
        isActive: true,
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, createdAt: true },
            },
          },
          where: { isActive: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: { id: true, email: true, createdAt: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return rooms.map((room) => ({
      ...room,
      name: room.name || undefined,
      lastMessage: room.messages[0]
        ? {
            ...room.messages[0],
            replyToId: room.messages[0].replyToId || undefined,
          }
        : undefined,
      unreadCount: 0, // Будем считать отдельно если нужно
      participants: room.participants.map((p) => ({
        ...p,
        lastReadAt: p.lastReadAt || undefined,
      })),
    })) as ChatRoom[];
  }

  // Создать новую комнату
  async createRoom(
    creatorId: number,
    data: CreateRoomRequest
  ): Promise<ChatRoom> {
    // Для приватного чата проверяем, не существует ли уже такая комната
    if (data.type === "PRIVATE" && data.participantIds.length === 1) {
      const existingRoom = await this.findPrivateRoom(
        creatorId,
        data.participantIds[0]
      );
      if (existingRoom) {
        return existingRoom;
      }
    }

    const room = await prisma.chatRoom.create({
      data: {
        name: data.name,
        type: data.type,
        createdBy: creatorId,
        participants: {
          create: [
            { userId: creatorId },
            ...data.participantIds.map((id) => ({ userId: id })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, createdAt: true },
            },
          },
        },
      },
    });

    return {
      ...room,
      name: room.name || undefined,
      participants: room.participants.map((p) => ({
        ...p,
        lastReadAt: p.lastReadAt || undefined,
      })),
    } as ChatRoom;
  }

  // Найти приватную комнату между двумя пользователями
  async findPrivateRoom(
    userId1: number,
    userId2: number
  ): Promise<ChatRoom | null> {
    const room = await prisma.chatRoom.findFirst({
      where: {
        type: "PRIVATE",
        isActive: true,
        participants: {
          every: {
            userId: { in: [userId1, userId2] },
            isActive: true,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!room) return null;

    return {
      ...room,
      name: room.name || undefined,
      participants: room.participants.map((p) => ({
        ...p,
        lastReadAt: p.lastReadAt || undefined,
      })),
    } as ChatRoom;
  }

  // Получить сообщения комнаты
  async getRoomMessages(
    roomId: string,
    userId: number,
    page = 1,
    limit = 50
  ): Promise<ChatMessage[]> {
    // Проверяем, что пользователь участник комнаты
    const participant = await prisma.chatParticipant.findFirst({
      where: { roomId, userId, isActive: true },
    });

    if (!participant) {
      throw new Error("Access denied");
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: { id: true, email: true, createdAt: true },
        },
        replyTo: {
          include: {
            sender: {
              select: { id: true, email: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return messages.reverse().map((message) => ({
      ...message,
      replyToId: message.replyToId || undefined,
      replyTo: message.replyTo
        ? {
            ...message.replyTo,
            replyToId: message.replyTo.replyToId || undefined,
          }
        : undefined,
    })) as ChatMessage[];
  }

  // Отправить сообщение
  async sendMessage(
    senderId: number,
    roomId: string,
    content: string,
    messageType = "TEXT",
    replyToId?: string
  ): Promise<ChatMessage> {
    // Проверяем, что пользователь участник комнаты
    const participant = await prisma.chatParticipant.findFirst({
      where: { roomId, userId: senderId, isActive: true },
    });

    if (!participant) {
      throw new Error("Access denied");
    }

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        content,
        messageType: messageType as any,
        replyToId,
      },
      include: {
        sender: {
          select: { id: true, email: true, createdAt: true },
        },
        replyTo: {
          include: {
            sender: {
              select: { id: true, email: true, createdAt: true },
            },
          },
        },
      },
    });

    // Обновляем время последнего обновления комнаты
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return {
      ...message,
      replyToId: message.replyToId || undefined,
      replyTo: message.replyTo
        ? {
            ...message.replyTo,
            replyToId: message.replyTo.replyToId || undefined,
          }
        : undefined,
    } as ChatMessage;
  }

  // Отметить сообщения как прочитанные
  async markAsRead(userId: number, roomId: string): Promise<void> {
    await prisma.chatParticipant.updateMany({
      where: { userId, roomId },
      data: { lastReadAt: new Date() },
    });
  }

  // Получить список всех пользователей (для выбора получателя)
  async getAllUsers(excludeUserId?: number): Promise<ChatUser[]> {
    const users = await prisma.user.findMany({
      where: excludeUserId ? { id: { not: excludeUserId } } : undefined,
      select: { id: true, email: true, createdAt: true },
      orderBy: { email: "asc" },
    });

    return users;
  }

  // Добавить участника в комнату
  async addParticipant(
    roomId: string,
    userId: number,
    addedBy: number
  ): Promise<void> {
    // Проверяем, что добавляющий является участником комнаты
    const adder = await prisma.chatParticipant.findFirst({
      where: { roomId, userId: addedBy, isActive: true },
    });

    if (!adder) {
      throw new Error("Access denied");
    }

    await prisma.chatParticipant.upsert({
      where: {
        roomId_userId: { roomId, userId },
      },
      update: {
        isActive: true,
        joinedAt: new Date(),
      },
      create: {
        roomId,
        userId,
      },
    });

    // Создаем системное сообщение
    await this.sendMessage(
      addedBy,
      roomId,
      `Пользователь присоединился к чату`,
      "SYSTEM"
    );
  }

  // Покинуть комнату
  async leaveRoom(roomId: string, userId: number): Promise<void> {
    await prisma.chatParticipant.updateMany({
      where: { roomId, userId },
      data: { isActive: false },
    });

    // Создаем системное сообщение
    await this.sendMessage(
      userId,
      roomId,
      `Пользователь покинул чат`,
      "SYSTEM"
    );
  }

  // Удалить сообщение
  async deleteMessage(messageId: string, userId: number): Promise<void> {
    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, senderId: userId },
    });

    if (!message) {
      throw new Error("Message not found or access denied");
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, content: "Сообщение удалено" },
    });
  }

  // Редактировать сообщение
  async editMessage(
    messageId: string,
    userId: number,
    newContent: string
  ): Promise<ChatMessage> {
    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, senderId: userId },
    });

    if (!message) {
      throw new Error("Message not found or access denied");
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, email: true, createdAt: true },
        },
        replyTo: {
          include: {
            sender: {
              select: { id: true, email: true, createdAt: true },
            },
          },
        },
      },
    });

    return {
      ...updatedMessage,
      replyToId: updatedMessage.replyToId || undefined,
      replyTo: updatedMessage.replyTo
        ? {
            ...updatedMessage.replyTo,
            replyToId: updatedMessage.replyTo.replyToId || undefined,
          }
        : undefined,
    } as ChatMessage;
  }
}
