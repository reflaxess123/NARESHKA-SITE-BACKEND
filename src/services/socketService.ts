import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { ChatService } from "./chatService";
import { OnlineUser, SocketEvents, SendMessageRequest } from "../types/chat";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userEmail?: string;
}

import { Socket } from "socket.io";

export class SocketService {
  private io: SocketIOServer;
  private chatService: ChatService;
  private onlineUsers: Map<number, OnlineUser> = new Map();
  private userSockets: Map<number, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          "https://nareshka.site",
          "https://v2.nareshka.site",
          "http://localhost:5173",
        ],
        credentials: true,
        methods: ["GET", "POST"],
      },
    });

    this.chatService = new ChatService();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      console.log("User connected:", socket.id);

      // Аутентификация через сессию
      socket.on(
        "authenticate",
        async (sessionData: { userId: number; userEmail: string }) => {
          try {
            socket.userId = sessionData.userId;
            socket.userEmail = sessionData.userEmail;

            // Добавляем пользователя в онлайн
            this.addOnlineUser(sessionData.userId, socket.id);

            // Присоединяем к комнатам пользователя
            await this.joinUserRooms(socket);

            socket.emit("authenticated", { success: true });
            console.log(`User ${sessionData.userEmail} authenticated`);
          } catch (error) {
            console.error("Authentication error:", error);
            socket.emit("error", { message: "Authentication failed" });
          }
        }
      );

      // Присоединение к комнате
      socket.on("join_room", async (roomId: string) => {
        if (!socket.userId) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        try {
          // Проверяем доступ к комнате
          const messages = await this.chatService.getRoomMessages(
            roomId,
            socket.userId,
            1,
            1
          );
          socket.join(roomId);
          console.log(`User ${socket.userId} joined room ${roomId}`);
        } catch (error) {
          socket.emit("error", { message: "Access denied to room" });
        }
      });

      // Покидание комнаты
      socket.on("leave_room", (roomId: string) => {
        socket.leave(roomId);
        console.log(`User ${socket.userId} left room ${roomId}`);
      });

      // Отправка сообщения
      socket.on("send_message", async (data: SendMessageRequest) => {
        if (!socket.userId) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        try {
          const message = await this.chatService.sendMessage(
            socket.userId,
            data.roomId,
            data.content,
            data.messageType || "TEXT",
            data.replyToId
          );

          // Отправляем сообщение всем участникам комнаты
          this.io.to(data.roomId).emit("message_received", message);

          console.log(
            `Message sent in room ${data.roomId} by user ${socket.userId}`
          );
        } catch (error) {
          console.error("Send message error:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // Отметка сообщений как прочитанных
      socket.on("mark_as_read", async (roomId: string) => {
        if (!socket.userId) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        try {
          await this.chatService.markAsRead(socket.userId, roomId);
          // Уведомляем других участников о прочтении
          socket.to(roomId).emit("messages_read", {
            userId: socket.userId,
            roomId,
            readAt: new Date(),
          });
        } catch (error) {
          console.error("Mark as read error:", error);
        }
      });

      // Индикатор печати
      socket.on("typing_start", (roomId: string) => {
        if (!socket.userId) return;
        socket.to(roomId).emit("user_typing", socket.userId, roomId);
      });

      socket.on("typing_stop", (roomId: string) => {
        if (!socket.userId) return;
        socket.to(roomId).emit("user_stopped_typing", socket.userId, roomId);
      });

      // Отключение
      socket.on("disconnect", () => {
        if (socket.userId) {
          this.removeOnlineUser(socket.userId, socket.id);
          console.log(`User ${socket.userId} disconnected`);
        }
      });
    });
  }

  private addOnlineUser(userId: number, socketId: string) {
    // Добавляем socket ID к пользователю
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    // Обновляем информацию об онлайн пользователе
    this.onlineUsers.set(userId, {
      userId,
      socketId,
      joinedAt: new Date(),
    });

    // Уведомляем о том, что пользователь онлайн
    this.io.emit("user_online", userId);
  }

  private removeOnlineUser(userId: number, socketId: string) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);

      // Если у пользователя больше нет активных соединений
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
        this.onlineUsers.delete(userId);

        // Уведомляем о том, что пользователь оффлайн
        this.io.emit("user_offline", userId);
      }
    }
  }

  private async joinUserRooms(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    try {
      const rooms = await this.chatService.getUserRooms(socket.userId);
      for (const room of rooms) {
        socket.join(room.id);
      }
    } catch (error) {
      console.error("Error joining user rooms:", error);
    }
  }

  // Публичные методы для использования в REST API

  // Уведомить о новой комнате
  public notifyRoomCreated(room: any) {
    // Уведомляем всех участников о новой комнате
    room.participants.forEach((participant: any) => {
      const userSockets = this.userSockets.get(participant.userId);
      if (userSockets) {
        userSockets.forEach((socketId) => {
          this.io.to(socketId).emit("room_created", room);
        });
      }
    });
  }

  // Уведомить об обновлении комнаты
  public notifyRoomUpdated(roomId: string, room: any) {
    this.io.to(roomId).emit("room_updated", room);
  }

  // Уведомить об удалении сообщения
  public notifyMessageDeleted(roomId: string, messageId: string) {
    this.io.to(roomId).emit("message_deleted", messageId, roomId);
  }

  // Уведомить об обновлении сообщения
  public notifyMessageUpdated(roomId: string, message: any) {
    this.io.to(roomId).emit("message_updated", message);
  }

  // Получить список онлайн пользователей
  public getOnlineUsers(): number[] {
    return Array.from(this.onlineUsers.keys());
  }

  // Проверить, онлайн ли пользователь
  public isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  // Отправить приватное уведомление пользователю
  public sendToUser(userId: number, event: string, data: any) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  // Получить экземпляр Socket.IO для использования в других местах
  public getIO(): SocketIOServer {
    return this.io;
  }
}
