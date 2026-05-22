"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const chat_model_1 = require("../../DB/models/chat.model");
const repositories_1 = require("../../DB/repositories");
const res_1 = require("../../utils/res");
const s3_config_1 = require("../../utils/aws/s3.config");
const user_model_1 = require("../../DB/models/user.model");
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const gateway = __importStar(require("../gateway/gateway"));
class ChatService {
    _chatModel = new repositories_1.ChatRepository(chat_model_1.chatModel);
    _userModel = new repositories_1.UserRepository(user_model_1.userModel);
    constructor() { }
    getUserChats = async (req, res) => {
        const userId = req.user?._id;
        const chats = await this._chatModel.find({ participants: { $in: [userId] } }, undefined, {
            populate: [{ path: "participants", select: "fName lName profileImage username" }],
        });
        return (0, res_1.successResponse)({ res, data: { chats } });
    };
    getChat = async (req, res) => {
        const { userId } = req.params;
        const { cursor, limit = 10, after } = req.query;
        if (after && cursor) {
            throw new res_1.BadRequestException("Cannot use after and cursor at the same time.");
        }
        const chatDoc = await this._chatModel.findOne({
            participants: { $all: [userId, req.user?._id] },
            groupName: { $exists: false },
        }, undefined, {
            populate: [{ path: "participants", select: "fName lName profileImage username" }],
        });
        if (!chatDoc)
            throw new res_1.BadRequestException("Fail to find matching chat");
        const chat = chatDoc.toObject();
        let filteredMessages = (chat.messages || []).filter((m) => !m.deletedAt);
        if (cursor) {
            const cursorDate = new Date(cursor).getTime();
            filteredMessages = filteredMessages.filter((m) => new Date(m.createdAt).getTime() < cursorDate);
        }
        else if (after) {
            const afterDate = new Date(after).getTime();
            filteredMessages = filteredMessages.filter((m) => new Date(m.createdAt).getTime() > afterDate);
        }
        const takeLimit = parseInt(limit);
        if (filteredMessages.length > takeLimit) {
            filteredMessages = filteredMessages.slice(-takeLimit);
        }
        chat.messages = filteredMessages;
        const nextCursor = filteredMessages.length ? filteredMessages[0]?.createdAt : "";
        return (0, res_1.successResponse)({
            res,
            data: { chat, nextCursor: nextCursor },
        });
    };
    createGroup = async (req, res) => {
        const { groupName } = req.body;
        const raw = req.body.participants;
        const participants = Array.isArray(raw) ? raw : [raw];
        const creatorId = req.user?._id;
        const creator = await this._userModel.findOne({ _id: creatorId });
        if (!creator)
            throw new res_1.BadRequestException("Creator not found");
        const creatorFriends = (creator.friends || []).map((f) => f.toString());
        const nonFriends = participants.filter((id) => !creatorFriends.includes(id));
        if (nonFriends.length > 0) {
            throw new res_1.BadRequestException("You can only add friends to a group");
        }
        let groupImageKey;
        if (req.file) {
            groupImageKey = await (0, s3_config_1.uploadFile)({
                file: req.file,
                path: `chat/groups/${creatorId.toString()}`,
            });
        }
        const allParticipants = [
            creatorId,
            ...participants.map((id) => mongoose_1.Types.ObjectId.createFromHexString(id)),
        ];
        const chat = await this._chatModel.create({
            createdBy: creatorId,
            roomId: (0, uuid_1.v4)(),
            groupName,
            ...(groupImageKey ? { groupImage: groupImageKey } : {}),
            participants: allParticipants,
            messages: [],
        });
        await chat.populate("participants", "fName lName profileImage username");
        allParticipants.forEach((pid) => {
            gateway.io.to(pid.toString()).emit("joinRoom", { roomId: chat.roomId, chat });
        });
        return (0, res_1.successResponse)({ res, statusCode: 201, data: { chat } });
    };
    getGroupChat = async (req, res) => {
        const { chatId } = req.params;
        const { cursor, limit = 10, after } = req.query;
        if (after && cursor) {
            throw new res_1.BadRequestException("Cannot use after and cursor at the same time.");
        }
        const chatDoc = await this._chatModel.findOne({
            _id: chatId,
            participants: { $in: [req.user._id] },
            groupName: { $exists: true },
        }, undefined, {
            populate: [{ path: "participants", select: "fName lName profileImage username" }],
        });
        if (!chatDoc)
            throw new res_1.BadRequestException("Group chat not found");
        const chat = chatDoc.toObject();
        let filteredMessages = (chat.messages || []).filter((m) => !m.deletedAt);
        if (cursor) {
            const cursorDate = new Date(cursor).getTime();
            filteredMessages = filteredMessages.filter((m) => new Date(m.createdAt).getTime() < cursorDate);
        }
        else if (after) {
            const afterDate = new Date(after).getTime();
            filteredMessages = filteredMessages.filter((m) => new Date(m.createdAt).getTime() > afterDate);
        }
        const takeLimit = parseInt(limit);
        if (filteredMessages.length > takeLimit) {
            filteredMessages = filteredMessages.slice(-takeLimit);
        }
        chat.messages = filteredMessages;
        const nextCursor = filteredMessages.length ? filteredMessages[0]?.createdAt : "";
        return (0, res_1.successResponse)({
            res,
            data: { chat, nextCursor: nextCursor },
        });
    };
    updateGroup = async (req, res) => {
        const { chatId } = req.params;
        const body = (req.body ?? {});
        const groupName = body?.groupName;
        const removeImage = body?.removeImage;
        const userId = req.user?._id;
        const chat = await this._chatModel.findOne({
            _id: chatId,
            createdBy: userId,
            groupName: { $exists: true },
        });
        if (!chat)
            throw new res_1.BadRequestException("Group not found or unauthorized");
        const updateData = {};
        if (groupName)
            updateData.groupName = groupName;
        if (req.file) {
            const groupImageKey = await (0, s3_config_1.uploadFile)({
                file: req.file,
                path: `chat/groups/${userId.toString()}`,
            });
            updateData.groupImage = groupImageKey;
        }
        else if (removeImage) {
            updateData.groupImage = null;
        }
        const updated = await this._chatModel.findOneAndUpdate({ _id: chatId }, { $set: updateData }, { new: true });
        if (updated) {
            gateway.io.to(chat.roomId).emit("groupUpdated", {
                chatId,
                groupName: updated.groupName,
                groupImage: updated.groupImage ?? null,
            });
        }
        return (0, res_1.successResponse)({ res, data: { chat: updated } });
    };
    deleteChat = async (req, res) => {
        const { chatId } = req.params;
        const userId = req.user?._id;
        const chat = await this._chatModel.findOne({
            _id: chatId,
            participants: { $in: [userId] },
            groupName: { $exists: false },
        });
        if (!chat)
            throw new res_1.BadRequestException("Chat not found");
        await this._chatModel.findOneAndUpdate({ _id: chatId }, { $set: { deletedAt: new Date(), deletedBy: userId } });
        const [p1, p2] = chat.participants.map((p) => p.toString());
        gateway.io.to(p1).emit("chatDeleted", { chatId, otherUserId: p2 });
        gateway.io.to(p2).emit("chatDeleted", { chatId, otherUserId: p1 });
        return (0, res_1.successResponse)({ res, data: { message: "Chat deleted" } });
    };
    deleteGroup = async (req, res) => {
        const { chatId } = req.params;
        const userId = req.user?._id;
        const chat = await this._chatModel.findOne({
            _id: chatId,
            createdBy: userId,
            groupName: { $exists: true },
        });
        if (!chat)
            throw new res_1.BadRequestException("Group not found or unauthorized");
        await this._chatModel.findOneAndUpdate({ _id: chatId }, { $set: { deletedAt: new Date(), deletedBy: userId } });
        const participantIds = (chat.participants || []).map((p) => p.toString());
        participantIds.forEach((pid) => {
            gateway.io.to(pid).emit("chatDeleted", { chatId });
        });
        return (0, res_1.successResponse)({ res, data: { message: "Group deleted" } });
    };
    getGroupParticipants = async (req, res) => {
        const { chatId } = req.params;
        const userId = req.user._id;
        const chat = await this._chatModel.findOne({
            _id: chatId,
            participants: { $in: [userId] },
            groupName: { $exists: true },
        }, undefined, {
            populate: [{ path: "participants", select: "fName lName profileImage username" }],
        });
        if (!chat)
            throw new res_1.BadRequestException("Group not found");
        return (0, res_1.successResponse)({
            res,
            data: {
                participants: chat.participants,
                roomId: chat.roomId,
                createdBy: chat.createdBy,
            },
        });
    };
    freezeChat = async (req, res) => {
        const { chatId } = req.params;
        const userId = req.user?._id;
        const chat = await this._chatModel.findOne({ _id: chatId });
        if (!chat)
            throw new res_1.BadRequestException("Chat not found or already frozen");
        await this._chatModel.findOneAndUpdate({ _id: chatId }, { $set: { deletedAt: new Date(), deletedBy: userId } });
        const participantIds = (chat.participants || []).map((p) => p.toString());
        participantIds.forEach((pid) => {
            gateway.io.to(pid).emit("chatDeleted", { chatId });
        });
        return (0, res_1.successResponse)({ res, data: { message: "Chat frozen" } });
    };
    restoreChat = async (req, res) => {
        const { chatId } = req.params;
        const chat = await this._chatModel.findOne({ _id: chatId, paranoid: false });
        if (!chat)
            throw new res_1.BadRequestException("Chat not found");
        if (!chat.deletedAt)
            throw new res_1.BadRequestException("Chat is not frozen");
        await this._chatModel.findOneAndUpdate({ _id: chatId, paranoid: false }, { $unset: { deletedAt: 1, deletedBy: 1 } });
        return (0, res_1.successResponse)({ res, data: { message: "Chat restored" } });
    };
    hardDeleteChat = async (req, res) => {
        const { chatId } = req.params;
        const chat = await this._chatModel.findOne({ _id: chatId, paranoid: false });
        if (!chat)
            throw new res_1.BadRequestException("Chat not found");
        if (!chat.deletedAt) {
            throw new res_1.BadRequestException("Freeze the chat first before permanently deleting it");
        }
        await this._chatModel.deleteOne({ _id: chatId, paranoid: false });
        return (0, res_1.successResponse)({ res, data: { message: "Chat permanently deleted" } });
    };
    deleteMessage = async (req, res) => {
        const { chatId, messageId } = req.params;
        const userId = req.user?._id;
        const chat = await this._chatModel.findOne({
            _id: chatId,
            participants: { $in: [userId] },
        });
        if (!chat)
            throw new res_1.BadRequestException("Chat not found");
        const message = chat.messages.find((m) => m._id.toString() === messageId);
        if (!message)
            throw new res_1.BadRequestException("Message not found");
        if (message.createdBy.toString() !== userId.toString()) {
            throw new res_1.BadRequestException("Cannot delete another user's message");
        }
        await this._chatModel.findOneAndUpdate({ _id: chatId, "messages._id": messageId }, {
            $set: {
                "messages.$.deletedAt": new Date(),
                "messages.$.deletedBy": userId,
                "messages.$.content": "",
                "messages.$.attachments": [],
            },
        });
        return (0, res_1.successResponse)({ res, data: { message: "Message deleted" } });
    };
    sendMessage = async ({ content, attachments, sendTo, socket, io, }) => {
        if (!content && !attachments?.length)
            return;
        try {
            const sender = socket.data.credentials?.user;
            if (!sender)
                throw new res_1.BadRequestException("Invalid sender");
            const user = await this._userModel.findOne({
                _id: mongoose_1.Types.ObjectId.createFromHexString(sendTo),
                friends: { $in: [mongoose_1.Types.ObjectId.createFromHexString(sender._id.toString())] },
            });
            if (!user)
                throw new res_1.BadRequestException("Invalid recipient friend");
            let attachmentsKeys = [];
            if (attachments?.length) {
                const filesToUpload = attachments.map((att) => ({
                    buffer: Buffer.from(att.buffer),
                    originalname: att.originalname,
                    mimetype: att.mimetype,
                }));
                attachmentsKeys = (await (0, s3_config_1.uploadFiles)({
                    files: filesToUpload,
                    path: `chat/${sender._id.toString()}/${sendTo}`,
                }));
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
            chat = await this._chatModel.findOneAndUpdate({ _id: chat._id }, { $push: { messages: newMessage } }, { new: true });
            if (!chat)
                throw new Error("Failed to update chat with new message");
            await chat.populate("participants", "fName lName profileImage username");
            const savedMessage = chat.messages[chat.messages.length - 1];
            if (!savedMessage)
                throw new Error("Failed to retrieve saved message");
            const populatedMessage = {
                ...savedMessage,
                createdBy: {
                    _id: sender._id,
                    fName: sender.fName,
                    lName: sender.lName,
                    profileImage: sender.profileImage,
                    username: sender.username,
                },
            };
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
        }
        catch (error) {
            console.error("Error in sendMessage:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    };
    sendGroupMessage = async ({ content, attachments, chatId, socket, io, }) => {
        if (!content && !attachments?.length)
            return;
        try {
            const sender = socket.data.credentials?.user;
            if (!sender)
                throw new res_1.BadRequestException("Invalid sender");
            const chat = await this._chatModel.findOne({
                _id: chatId,
                participants: { $in: [sender._id] },
                groupName: { $exists: true },
            });
            if (!chat)
                throw new res_1.BadRequestException("Group chat not found or access denied");
            let attachmentsKeys = [];
            if (attachments?.length) {
                const filesToUpload = attachments.map((att) => ({
                    buffer: Buffer.from(att.buffer),
                    originalname: att.originalname,
                    mimetype: att.mimetype,
                }));
                attachmentsKeys = (await (0, s3_config_1.uploadFiles)({
                    files: filesToUpload,
                    path: `chat/groups/${chatId}`,
                }));
            }
            const newMessage = {
                createdBy: sender._id,
                content: content || "",
                attachments: attachmentsKeys,
            };
            const updated = await this._chatModel.findOneAndUpdate({ _id: chatId }, { $push: { messages: newMessage } }, { new: true });
            if (!updated)
                throw new Error("Failed to update group chat");
            const savedMessage = updated.messages[updated.messages.length - 1];
            if (!savedMessage)
                throw new Error("Failed to retrieve saved message");
            const populatedMessage = {
                ...savedMessage,
                createdBy: {
                    _id: sender._id,
                    fName: sender.fName,
                    lName: sender.lName,
                    profileImage: sender.profileImage,
                    username: sender.username,
                },
            };
            io.to(chat.roomId).emit("receiveGroupMessage", {
                chatId: chat._id,
                message: populatedMessage,
            });
        }
        catch (error) {
            console.error("Error in sendGroupMessage:", error);
            socket.emit("error", { message: "Failed to send group message" });
        }
    };
    deleteMessageSocket = async ({ chatId, messageId, socket, io, }) => {
        try {
            const sender = socket.data.credentials?.user;
            if (!sender)
                throw new res_1.BadRequestException("Invalid sender");
            const chat = await this._chatModel.findOne({
                _id: chatId,
                participants: { $in: [sender._id] },
            });
            if (!chat)
                throw new res_1.BadRequestException("Chat not found");
            const message = chat.messages.find((m) => m._id.toString() === messageId);
            if (!message)
                throw new res_1.BadRequestException("Message not found");
            if (message.createdBy.toString() !== sender._id.toString()) {
                throw new res_1.BadRequestException("Cannot delete another user's message");
            }
            await this._chatModel.findOneAndUpdate({ _id: chatId, "messages._id": messageId }, {
                $set: {
                    "messages.$.deletedAt": new Date(),
                    "messages.$.deletedBy": sender._id,
                    "messages.$.content": "",
                    "messages.$.attachments": [],
                },
            });
            const targetRoom = chat.roomId
                ? chat.roomId
                : chat.participants.map((p) => p.toString());
            io.to(targetRoom).emit("messageDeleted", { chatId, messageId });
        }
        catch (error) {
            console.error("Error in deleteMessageSocket:", error);
            socket.emit("error", { message: "Failed to delete message" });
        }
    };
    deleteChatSocket = async ({ chatId, socket, io }) => {
        try {
            const sender = socket.data.credentials?.user;
            if (!sender)
                throw new res_1.BadRequestException("Invalid sender");
            const chat = await this._chatModel.findOne({
                _id: chatId,
                participants: { $in: [sender._id] },
            });
            if (!chat)
                throw new res_1.BadRequestException("Chat not found");
            const isGroup = !!chat.groupName;
            const isCreator = chat.createdBy.toString() === sender._id.toString();
            if (isGroup && !isCreator) {
                await this._chatModel.findOneAndUpdate({ _id: chatId }, { $pull: { participants: sender._id } });
                io.in(sender._id.toString()).socketsLeave(chat.roomId);
                io.to(chat.roomId).emit("participantLeft", {
                    chatId,
                    userId: sender._id.toString(),
                });
                io.to(sender._id.toString()).emit("chatDeleted", { chatId });
            }
            else {
                const allParticipantIds = chat.participants.map((p) => p.toString());
                await this._chatModel.findOneAndUpdate({ _id: chatId }, { $set: { deletedAt: new Date(), deletedBy: sender._id } });
                if (isGroup) {
                    allParticipantIds.forEach((pid) => {
                        io.to(pid).emit("chatDeleted", { chatId });
                    });
                }
                else {
                    const [p1, p2] = allParticipantIds;
                    io.to(p1).emit("chatDeleted", { chatId, otherUserId: p2 });
                    io.to(p2).emit("chatDeleted", { chatId, otherUserId: p1 });
                }
            }
        }
        catch (error) {
            console.error("Error in deleteChatSocket:", error);
            socket.emit("error", { message: "Failed to delete chat" });
        }
    };
}
exports.ChatService = ChatService;
