import { z } from "zod";
import {
  createGroupSchema,
  deleteChatSchema,
  deleteMessageSchema,
  getChatSchema,
  getGroupChatSchema,
  updateGroupSchema,
} from "./chat.validation";
import { Server, Socket } from "socket.io";

// ─── REST DTOs ────────────────────────────────────────────────────────────────

export type GetChatDto = z.infer<typeof getChatSchema.params>;
export type GetChatQueryDto = {
  cursor?: string;
  limit?: number;
  after?: string;
};

export type CreateGroupChatDto = z.infer<typeof createGroupSchema.body>;

export type GetGroupChatParamsDto = z.infer<typeof getGroupChatSchema.params>;
export type GetGroupChatQueryDto = GetChatQueryDto;

export type DeleteMessageParamsDto = z.infer<typeof deleteMessageSchema.params>;
export type DeleteChatParamsDto = z.infer<typeof deleteChatSchema.params>;

export type UpdateGroupParamsDto = z.infer<typeof updateGroupSchema.params>;
export type UpdateGroupBodyDto = z.infer<
  NonNullable<typeof updateGroupSchema.body>
>;

// ─── Socket DTOs ─────────────────────────────────────────────────────────────

export type SendMessageDto = {
  content?: string;
  attachments?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }[];
  sendTo: string;       // userId  (OVO)
  socket: Socket;
  io: Server;
};

export type SendGroupMessageDto = {
  content?: string;
  attachments?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }[];
  chatId: string;       // groupChatId  (OVM)
  socket: Socket;
  io: Server;
};

export type DeleteMessageSocketDto = {
  chatId: string;
  messageId: string;
  socket: Socket;
  io: Server;
};

export type DeleteChatSocketDto = {
  chatId: string;
  socket: Socket;
  io: Server;
};