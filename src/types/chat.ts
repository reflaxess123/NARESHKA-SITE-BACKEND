export interface ChatUser {
  id: number;
  email: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface ChatRoom {
  id: string;
  name?: string;
  type: "PRIVATE" | "GROUP";
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatParticipant {
  id: string;
  roomId: string;
  userId: number;
  user: ChatUser;
  joinedAt: Date;
  lastReadAt?: Date;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: number;
  sender: ChatUser;
  content: string;
  messageType: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  replyToId?: string;
  replyTo?: ChatMessage;
}

export interface CreateRoomRequest {
  participantIds: number[];
  name?: string;
  type: "PRIVATE" | "GROUP";
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  messageType?: "TEXT" | "IMAGE" | "FILE";
  replyToId?: string;
}

export interface SocketEvents {
  // Клиент -> Сервер
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  send_message: (data: SendMessageRequest) => void;
  mark_as_read: (roomId: string) => void;
  typing_start: (roomId: string) => void;
  typing_stop: (roomId: string) => void;

  // Сервер -> Клиент
  message_received: (message: ChatMessage) => void;
  message_updated: (message: ChatMessage) => void;
  message_deleted: (messageId: string, roomId: string) => void;
  user_joined: (user: ChatUser, roomId: string) => void;
  user_left: (userId: number, roomId: string) => void;
  user_typing: (userId: number, roomId: string) => void;
  user_stopped_typing: (userId: number, roomId: string) => void;
  room_updated: (room: ChatRoom) => void;
  error: (error: { message: string; code?: string }) => void;
}

export interface OnlineUser {
  userId: number;
  socketId: string;
  joinedAt: Date;
}
