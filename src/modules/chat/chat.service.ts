import type { Request, Response } from "express";
import { chatModel } from "../../DB/models/chat.model";
import { ChatRepository, UserRepository } from "../../DB/repositories";
import { BadRequestException, successResponse } from "../../utils/res";
import {
  DeleteChatParamsDto,
  DeleteChatSocketDto,
  DeleteMessageParamsDto,
  DeleteMessageSocketDto,
  GetChatDto,
  GetChatQueryDto,
  GetGroupChatParamsDto,
  SendGroupMessageDto,
  SendMessageDto,
  UpdateGroupBodyDto,
  UpdateGroupParamsDto,
} from "./chat.dto";
import { ChatResponseType } from "../../utils/types";
import { uploadFile, uploadFiles } from "../../utils/aws/s3.config";
import { userModel } from "../../DB/models/user.model";
import { Types } from "mongoose";
import { v4 as uuid } from "uuid";
import * as gateway from "../gateway/gateway";

export class ChatService {
  private _chatModel = new ChatRepository(chatModel);
  private _userModel = new UserRepository(userModel);
  constructor() {}

  // ============================================================
  // REST API
  // ============================================================

  // ─── Get all user conversations (OVO + OVM) ─────────────────
  getUserChats = async (req: Request, res: Response): Promise<Response> => {
    const userId = req!.user?._id;

    const chats = await this._chatModel.find(
      { participants: { $in: [userId!] } },
      undefined,
      {
        populate: [{ path: "participants", select: "fName lName profileImage username" }],
      },
    );

    return successResponse({ res, data: { chats } });
  };

  // ─── Get OVO direct chat ─────────────────────────────────────
  getChat = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as unknown as GetChatDto;
    const { cursor, limit = 10, after } = req.query as unknown as GetChatQueryDto;

    if (after && cursor) {
      throw new BadRequestException("Cannot use after and cursor at the same time.");
    }

    const chatDoc = await this._chatModel.findOne(
      {
        participants: { $all: [userId, req!.user?._id] },
        groupName: { $exists: false },
      },
      undefined,
      {
        populate: [{ path: "participants", select: "fName lName profileImage username" }],
      },
    );
    if (!chatDoc) throw new BadRequestException("Fail to find matching chat");

    const chat = chatDoc.toObject();
    let filteredMessages = (chat.messages || []).filter(
      (m: any) => !m.deletedAt,
    );

    if (cursor) {
      const cursorDate = new Date(cursor).getTime();
      filteredMessages = filteredMessages.filter(
        (m: any) => new Date(m.createdAt).getTime() < cursorDate,
      );
    } else if (after) {
      const afterDate = new Date(after).getTime();
      filteredMessages = filteredMessages.filter(
        (m: any) => new Date(m.createdAt).getTime() > afterDate,
      );
    }

    const takeLimit = parseInt(limit as unknown as string);
    if (filteredMessages.length > takeLimit) {
      filteredMessages = filteredMessages.slice(-takeLimit);
    }

    chat.messages = filteredMessages as any;
    const nextCursor = filteredMessages.length ? filteredMessages[0]?.createdAt : "";

    return successResponse<ChatResponseType & { nextCursor?: string }>({
      res,
      data: { chat, nextCursor: nextCursor as unknown as string } as any,
    });
  };

  // ─── Create OVM group chat ───────────────────────────────────
  createGroup = async (req: Request, res: Response): Promise<Response> => {
    const { groupName } = req.body;
    const raw = req.body.participants;
    const participants: string[] = Array.isArray(raw) ? raw : [raw];
    const creatorId = req!.user?._id!;

    // Validate all participants exist AND are friends with the creator
    const creator = await this._userModel.findOne({ _id: creatorId });
    if (!creator) throw new BadRequestException("Creator not found");

    const creatorFriends = (creator.friends || []).map((f: any) => f.toString());
    const nonFriends = participants.filter((id: string) => !creatorFriends.includes(id));
    if (nonFriends.length > 0) {
      throw new BadRequestException("You can only add friends to a group");
    }

    // Upload group image if provided
    let groupImageKey: string | undefined;
    if (req.file) {
      groupImageKey = await uploadFile({
        file: req.file,
        path: `chat/groups/${creatorId.toString()}`,
      });
    }

    const allParticipants = [
      creatorId,
      ...participants.map((id: string) => Types.ObjectId.createFromHexString(id)),
    ];

    const chat = await this._chatModel.create({
      createdBy: creatorId,
      roomId: uuid(),
      groupName,
      ...(groupImageKey ? { groupImage: groupImageKey } : {}),
      participants: allParticipants,
      messages: [],
    }) as unknown as any;

    await chat.populate("participants", "fName lName profileImage username");

    // Tell each participant to join the group room
    allParticipants.forEach((pid: any) => {
      gateway.io.to(pid.toString()).emit("joinRoom", { roomId: chat.roomId, chat });
    });

    return successResponse({ res, statusCode: 201, data: { chat } });
  };

  // ─── Get OVM group chat ──────────────────────────────────────
  getGroupChat = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params as unknown as GetGroupChatParamsDto;
    const { cursor, limit = 10, after } = req.query as unknown as GetChatQueryDto;

    if (after && cursor) {
      throw new BadRequestException("Cannot use after and cursor at the same time.");
    }

    const chatDoc = await this._chatModel.findOne(
      {
        _id: chatId,
        participants: { $in: [req!.user!._id] },
        groupName: { $exists: true },
      },
      undefined,
      {
        populate: [{ path: "participants", select: "fName lName profileImage username" }],
      },
    );
    if (!chatDoc) throw new BadRequestException("Group chat not found");

    const chat = chatDoc.toObject();
    let filteredMessages = (chat.messages || []).filter(
      (m: any) => !m.deletedAt,
    );

    if (cursor) {
      const cursorDate = new Date(cursor).getTime();
      filteredMessages = filteredMessages.filter(
        (m: any) => new Date(m.createdAt).getTime() < cursorDate,
      );
    } else if (after) {
      const afterDate = new Date(after).getTime();
      filteredMessages = filteredMessages.filter(
        (m: any) => new Date(m.createdAt).getTime() > afterDate,
      );
    }

    const takeLimit = parseInt(limit as unknown as string);
    if (filteredMessages.length > takeLimit) {
      filteredMessages = filteredMessages.slice(-takeLimit);
    }

    chat.messages = filteredMessages as any;
    const nextCursor = filteredMessages.length ? filteredMessages[0]?.createdAt : "";

    return successResponse<ChatResponseType & { nextCursor?: string }>({
      res,
      data: { chat, nextCursor: nextCursor as unknown as string } as any,
    });
  };

  // ─── Update group (name / image) ─────────────────────────────
  updateGroup = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params as unknown as UpdateGroupParamsDto;
    const body = (req.body ?? {}) as UpdateGroupBodyDto & { removeImage?: boolean };
    const groupName = body?.groupName;
    const removeImage = body?.removeImage;
    const userId = req!.user?._id!;

    const chat = await this._chatModel.findOne({
      _id: chatId,
      createdBy: userId,
      groupName: { $exists: true },
    });
    if (!chat) throw new BadRequestException("Group not found or unauthorized");

    const updateData: Record<string, any> = {};
    if (groupName) updateData.groupName = groupName;

    if (req.file) {
      const groupImageKey = await uploadFile({
        file: req.file,
        path: `chat/groups/${userId.toString()}`,
      });
      updateData.groupImage = groupImageKey;
    } else if (removeImage) {
      updateData.groupImage = null;
    }

    const updated = await this._chatModel.findOneAndUpdate(
      { _id: chatId },
      { $set: updateData },
      { new: true },
    );

    // Notify all group members via the shared roomId — cleaner than per-user emit
    if (updated) {
      gateway.io.to((chat as any).roomId!).emit("groupUpdated", {
        chatId,
        groupName: updated.groupName,
        groupImage: (updated as any).groupImage ?? null,
      });
    }

    return successResponse({ res, data: { chat: updated } });
  };

  // ─── Delete OVO chat (soft-delete) ───────────────────────────
  deleteChat = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params as unknown as DeleteChatParamsDto;
    const userId = req!.user?._id!;

    const chat = await this._chatModel.findOne({
      _id: chatId,
      participants: { $in: [userId] },
      groupName: { $exists: false },
    });
    if (!chat) throw new BadRequestException("Chat not found");

    await this._chatModel.findOneAndUpdate(
      { _id: chatId },
      { $set: { deletedAt: new Date(), deletedBy: userId } },
    );

    // Notify both participants — each gets the other's userId so FE can target the right cache
    const [p1, p2] = chat.participants.map((p: any) => p.toString());
    gateway.io.to(p1).emit("chatDeleted", { chatId, otherUserId: p2 });
    gateway.io.to(p2).emit("chatDeleted", { chatId, otherUserId: p1 });

    return successResponse({ res, data: { message: "Chat deleted" } });
  };

  // ─── Delete group (soft-delete, creator only) ─────────────────
  deleteGroup = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params as unknown as DeleteChatParamsDto;
    const userId = req!.user?._id!;

    const chat = await this._chatModel.findOne({
      _id: chatId,
      createdBy: userId,
      groupName: { $exists: true },
    });
    if (!chat) throw new BadRequestException("Group not found or unauthorized");

    await this._chatModel.findOneAndUpdate(
      { _id: chatId },
      { $set: { deletedAt: new Date(), deletedBy: userId } },
    );

    // Notify all group participants in real-time via their personal rooms
    const participantIds = (chat.participants || []).map((p: any) => p.toString());
    participantIds.forEach((pid: string) => {
      gateway.io.to(pid).emit("chatDeleted", { chatId });
    });

    return successResponse({ res, data: { message: "Group deleted" } });
  };

  // ─── Get group participants ─────────────────────────────────────
  getGroupParticipants = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params as unknown as GetGroupChatParamsDto;
    const userId = req!.user!._id;

    const chat = await this._chatModel.findOne(
      {
        _id: chatId,
        participants: { $in: [userId] },
        groupName: { $exists: true },
      },
      undefined,
      {
        populate: [{ path: "participants", select: "fName lName profileImage username" }],
      },
    );
    if (!chat) throw new BadRequestException("Group not found");

    return successResponse({
      res,
      data: {
        participants: chat.participants,
        roomId: (chat as any).roomId,
        createdBy: chat.createdBy,
      },
    });
  };

  // ─── Admin: freeze chat (soft-delete) ────────────────────────
  freezeChat = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params;
    const userId = req!.user?._id!;

    // Normal find — paranoid hook ensures we only find non-deleted chats
    const chat = await this._chatModel.findOne({ _id: chatId });
    if (!chat) throw new BadRequestException("Chat not found or already frozen");

    await this._chatModel.findOneAndUpdate(
      { _id: chatId },
      { $set: { deletedAt: new Date(), deletedBy: userId } },
    );

    // Notify all participants so they see the chat removed in real-time
    const participantIds = (chat.participants || []).map((p: any) => p.toString());
    participantIds.forEach((pid: string) => {
      gateway.io.to(pid).emit("chatDeleted", { chatId });
    });

    return successResponse({ res, data: { message: "Chat frozen" } });
  };

  // ─── Admin: restore chat (undo soft-delete) ───────────────────
  restoreChat = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params;

    const chat = await this._chatModel.findOne({ _id: chatId, paranoid: false } as any);
    if (!chat) throw new BadRequestException("Chat not found");
    if (!(chat as any).deletedAt) throw new BadRequestException("Chat is not frozen");

    await this._chatModel.findOneAndUpdate(
      { _id: chatId, paranoid: false } as any,
      { $unset: { deletedAt: 1, deletedBy: 1 } },
    );

    return successResponse({ res, data: { message: "Chat restored" } });
  };

  // ─── Admin: hard delete chat (permanent, frozen chats only) ─────
  hardDeleteChat = async (req: Request, res: Response): Promise<Response> => {
    const { chatId } = req.params;

    // paranoid: false to find even deleted (frozen) chats
    const chat = await this._chatModel.findOne({ _id: chatId, paranoid: false } as any);
    if (!chat) throw new BadRequestException("Chat not found");
    if (!(chat as any).deletedAt) {
      throw new BadRequestException("Freeze the chat first before permanently deleting it");
    }

    await this._chatModel.deleteOne({ _id: chatId, paranoid: false } as any);

    return successResponse({ res, data: { message: "Chat permanently deleted" } });
  };

  // ─── Delete single message (REST) ─────────────────────────────
  deleteMessage = async (req: Request, res: Response): Promise<Response> => {
    const { chatId, messageId } = req.params as unknown as DeleteMessageParamsDto;
    const userId = req!.user?._id!;

    const chat = await this._chatModel.findOne({
      _id: chatId,
      participants: { $in: [userId] },
    });
    if (!chat) throw new BadRequestException("Chat not found");

    const message = chat.messages.find(
      (m: any) => m._id.toString() === messageId,
    );
    if (!message) throw new BadRequestException("Message not found");
    if (message.createdBy.toString() !== userId.toString()) {
      throw new BadRequestException("Cannot delete another user's message");
    }

    await this._chatModel.findOneAndUpdate(
      { _id: chatId, "messages._id": messageId },
      {
        $set: {
          "messages.$.deletedAt": new Date(),
          "messages.$.deletedBy": userId,
          "messages.$.content": "",
          "messages.$.attachments": [],
        },
      },
    );

    return successResponse({ res, data: { message: "Message deleted" } });
  };

  // ============================================================
  // Socket IO
  // ============================================================

  // ─── Send OVO message ────────────────────────────────────────
  sendMessage = async ({
    content,
    attachments,
    sendTo,
    socket,
    io,
  }: SendMessageDto) => {
    if (!content && !attachments?.length) return;
    try {
      const sender = socket.data.credentials?.user;
      if (!sender) throw new BadRequestException("Invalid sender");

      const user = await this._userModel.findOne({
        _id: Types.ObjectId.createFromHexString(sendTo),
        friends: { $in: [Types.ObjectId.createFromHexString(sender._id.toString())] },
      });
      if (!user) throw new BadRequestException("Invalid recipient friend");

      let attachmentsKeys: string[] = [];
      if (attachments?.length) {
        // att.buffer arrives as a plain number[] from socket.io — convert to proper Buffer
        const filesToUpload = attachments.map((att) => ({
          buffer: Buffer.from(att.buffer),
          originalname: att.originalname,
          mimetype: att.mimetype,
        })) as Express.Multer.File[];

        attachmentsKeys = (await uploadFiles({
          files: filesToUpload,
          path: `chat/${sender._id.toString()}/${sendTo}`,
        })) as unknown as string[];
      }

      let chat = await this._chatModel.findOne({
        participants: { $all: [sender._id, sendTo] },
        groupName: { $exists: false },
      });

      if (!chat) {
        chat = await this._chatModel.create({
          createdBy: sender._id,
          participants: [sender._id, sendTo],
          messages: [],
        });
      }

      const newMessage = {
        createdBy: sender._id,
        content: content || "",
        attachments: attachmentsKeys,
      };

      chat = await this._chatModel.findOneAndUpdate(
        { _id: chat._id },
        { $push: { messages: newMessage } },
        { new: true },
      );
      if (!chat) throw new Error("Failed to update chat with new message");

      await chat.populate("participants", "fName lName profileImage username");

      const savedMessage = chat.messages[chat.messages.length - 1];
      if (!savedMessage) throw new Error("Failed to retrieve saved message");

      // Build a populated version of the saved message so the FE gets full user data
      const populatedMessage = {
        ...(savedMessage as any),
        createdBy: {
          _id: sender._id,
          fName: sender.fName,
          lName: sender.lName,
          profileImage: sender.profileImage,
          username: sender.username,
        },
      };

      // Emit to each side separately so they know who their "other" user is.
      // The FE query cache is keyed by ["chat", "ovo", otherUserId] not by chatId.
      const senderId = sender._id.toString();
      const receiverId = sendTo.toString();

      io.to(senderId).emit("receiveMessage", {
        chatId: chat._id,
        otherUserId: receiverId,
        message: populatedMessage,
      });
      io.to(receiverId).emit("receiveMessage", {
        chatId: chat._id,
        otherUserId: senderId,
        message: populatedMessage,
      });
    } catch (error) {
      console.error("Error in sendMessage:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  };

  // ─── Send OVM group message ───────────────────────────────────
  sendGroupMessage = async ({
    content,
    attachments,
    chatId,
    socket,
    io,
  }: SendGroupMessageDto) => {
    if (!content && !attachments?.length) return;
    try {
      const sender = socket.data.credentials?.user;
      if (!sender) throw new BadRequestException("Invalid sender");

      const chat = await this._chatModel.findOne({
        _id: chatId,
        participants: { $in: [sender._id] },
        groupName: { $exists: true },
      });
      if (!chat) throw new BadRequestException("Group chat not found or access denied");

      let attachmentsKeys: string[] = [];
      if (attachments?.length) {
        // att.buffer arrives as a plain number[] from socket.io — convert to proper Buffer
        const filesToUpload = attachments.map((att) => ({
          buffer: Buffer.from(att.buffer),
          originalname: att.originalname,
          mimetype: att.mimetype,
        })) as Express.Multer.File[];

        attachmentsKeys = (await uploadFiles({
          files: filesToUpload,
          path: `chat/groups/${chatId}`,
        })) as unknown as string[];
      }

      const newMessage = {
        createdBy: sender._id,
        content: content || "",
        attachments: attachmentsKeys,
      };

      const updated = await this._chatModel.findOneAndUpdate(
        { _id: chatId },
        { $push: { messages: newMessage } },
        { new: true },
      );
      if (!updated) throw new Error("Failed to update group chat");

      const savedMessage = updated.messages[updated.messages.length - 1];
      if (!savedMessage) throw new Error("Failed to retrieve saved message");

      // Build a populated version of the saved message so the FE gets full user data
      const populatedMessage = {
        ...(savedMessage as any),
        createdBy: {
          _id: sender._id,
          fName: sender.fName,
          lName: sender.lName,
          profileImage: sender.profileImage,
          username: sender.username,
        },
      };

      // Emit to the group room (all participants join roomId on connect)
      io.to(chat.roomId!).emit("receiveGroupMessage", {
        chatId: chat._id,
        message: populatedMessage,
      });
    } catch (error) {
      console.error("Error in sendGroupMessage:", error);
      socket.emit("error", { message: "Failed to send group message" });
    }
  };

  // ─── Delete message via socket ────────────────────────────────
  deleteMessageSocket = async ({
    chatId,
    messageId,
    socket,
    io,
  }: DeleteMessageSocketDto) => {
    try {
      const sender = socket.data.credentials?.user;
      if (!sender) throw new BadRequestException("Invalid sender");

      const chat = await this._chatModel.findOne({
        _id: chatId,
        participants: { $in: [sender._id] },
      });
      if (!chat) throw new BadRequestException("Chat not found");

      const message = chat.messages.find(
        (m: any) => m._id.toString() === messageId,
      );
      if (!message) throw new BadRequestException("Message not found");
      if (message.createdBy.toString() !== sender._id.toString()) {
        throw new BadRequestException("Cannot delete another user's message");
      }

      await this._chatModel.findOneAndUpdate(
        { _id: chatId, "messages._id": messageId },
        {
          $set: {
            "messages.$.deletedAt": new Date(),
            "messages.$.deletedBy": sender._id,
            "messages.$.content": "",
            "messages.$.attachments": [],
          },
        },
      );

      // Notify all participants (works for both OVO and OVM via roomId or participant IDs)
      const targetRoom = chat.roomId
        ? chat.roomId  // group → emit to roomId
        : chat.participants.map((p: any) => p.toString());

      io.to(targetRoom).emit("messageDeleted", { chatId, messageId });
    } catch (error) {
      console.error("Error in deleteMessageSocket:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  };

  // ─── Delete / leave chat via socket ──────────────────────────
  deleteChatSocket = async ({ chatId, socket, io }: DeleteChatSocketDto) => {
    try {
      const sender = socket.data.credentials?.user;
      if (!sender) throw new BadRequestException("Invalid sender");

      const chat = await this._chatModel.findOne({
        _id: chatId,
        participants: { $in: [sender._id] },
      });
      if (!chat) throw new BadRequestException("Chat not found");

      const isGroup = !!chat.groupName;
      const isCreator = chat.createdBy.toString() === sender._id.toString();

      if (isGroup && !isCreator) {
        // Leave group — remove from participants
        await this._chatModel.findOneAndUpdate(
          { _id: chatId },
          { $pull: { participants: sender._id } },
        );
        // Remove leaver's socket from the room
        io.in(sender._id.toString()).socketsLeave(chat.roomId!);
        // Notify REMAINING members that someone left (to update their participant list)
        io.to(chat.roomId!).emit("participantLeft", {
          chatId,
          userId: sender._id.toString(),
        });
        // Notify the LEAVER as chatDeleted — removes the group from their sidebar entirely
        io.to(sender._id.toString()).emit("chatDeleted", { chatId });
      } else {
        // Soft-delete — notify each participant via their personal userId room
        const allParticipantIds = chat.participants.map((p: any) => p.toString());
        await this._chatModel.findOneAndUpdate(
          { _id: chatId },
          { $set: { deletedAt: new Date(), deletedBy: sender._id } },
        );
        if (isGroup) {
          allParticipantIds.forEach((pid: string) => {
            io.to(pid).emit("chatDeleted", { chatId });
          });
        } else {
          // OVO: emit to each participant individually with their respective otherUserId
          const [p1, p2] = allParticipantIds;
          io.to(p1).emit("chatDeleted", { chatId, otherUserId: p2 });
          io.to(p2).emit("chatDeleted", { chatId, otherUserId: p1 });
        }
      }
    } catch (error) {
      console.error("Error in deleteChatSocket:", error);
      socket.emit("error", { message: "Failed to delete chat" });
    }
  };
}
