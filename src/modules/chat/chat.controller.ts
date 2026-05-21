import { Router } from "express";
import multer from "multer";
import { authentication, validation } from "../../middleware";
import { ChatService } from "./chat.service";
import * as CV from "./chat.validation";

export const chatRouter = Router();
const CS = new ChatService();
const upload = multer({ storage: multer.memoryStorage() });

// ─── OVO ─────────────────────────────────────────────────────────────────────

/** GET /chat — list all user conversations (OVO + OVM) */
chatRouter.get("/", authentication(), CS.getUserChats);

/** GET /chat/ovo/:userId — get direct chat with pagination */
chatRouter.get(
  "/ovo/:userId",
  authentication(),
  validation(CV.getChatSchema),
  CS.getChat,
);

/** DELETE /chat/ovo/:chatId — soft-delete a direct chat */
chatRouter.delete(
  "/ovo/:chatId",
  authentication(),
  validation(CV.deleteChatSchema),
  CS.deleteChat,
);

// ─── Messages ─────────────────────────────────────────────────────────────────

/** DELETE /chat/:chatId/messages/:messageId — soft-delete a message */
chatRouter.delete(
  "/:chatId/messages/:messageId",
  authentication(),
  validation(CV.deleteMessageSchema),
  CS.deleteMessage,
);

// ─── OVM (Groups) ─────────────────────────────────────────────────────────────

/** POST /chat/group — create a group chat (with optional image) */
chatRouter.post(
  "/group",
  authentication(),
  upload.single("groupImage"),
  validation(CV.createGroupSchema),
  CS.createGroup,
);

/** GET /chat/group/:chatId — get group chat messages with pagination */
chatRouter.get(
  "/group/:chatId",
  authentication(),
  validation(CV.getGroupChatSchema),
  CS.getGroupChat,
);

/** GET /chat/group/:chatId/participants — get group participants list */
chatRouter.get(
  "/group/:chatId/participants",
  authentication(),
  validation(CV.getGroupChatSchema),
  CS.getGroupParticipants,
);

/** PATCH /chat/group/:chatId — update group name / image (creator only) */
chatRouter.patch(
  "/group/:chatId",
  authentication(),
  upload.single("groupImage"),
  validation(CV.updateGroupSchema),
  CS.updateGroup,
);

/** DELETE /chat/group/:chatId — delete group (creator) or leave group (member) */
chatRouter.delete(
  "/group/:chatId",
  authentication(),
  validation(CV.deleteChatSchema),
  CS.deleteGroup,
);

// ─── Admin ────────────────────────────────────────────────────────────────────

/** PATCH /chat/:chatId/freeze — admin: soft-delete any chat */
chatRouter.patch(
  "/:chatId/freeze",
  authentication(),
  CS.freezeChat,
);

/** PATCH /chat/:chatId/restore — admin: restore a soft-deleted chat */
chatRouter.patch(
  "/:chatId/restore",
  authentication(),
  CS.restoreChat,
);

/** DELETE /chat/:chatId/hard — admin: permanently delete a frozen chat */
chatRouter.delete(
  "/:chatId/hard",
  authentication(),
  CS.hardDeleteChat,
);