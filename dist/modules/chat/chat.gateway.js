"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const chat_events_1 = require("./chat.events");
const repositories_1 = require("../../DB/repositories");
const chat_model_1 = require("../../DB/models/chat.model");
class ChatGateway {
    chatEvents = new chat_events_1.ChatEvents();
    _chatModel = new repositories_1.ChatRepository(chat_model_1.chatModel);
    constructor() { }
    register = async (socket, io) => {
        const userId = socket.data.credentials?.user?._id?.toString();
        if (userId) {
            const groups = await this._chatModel.find({
                participants: { $in: [userId] },
                groupName: { $exists: true },
                roomId: { $exists: true },
            });
            for (const group of groups) {
                if (group.roomId)
                    socket.join(group.roomId);
            }
        }
        this.chatEvents.sendMessage(socket, io);
        this.chatEvents.sendGroupMessage(socket, io);
        this.chatEvents.deleteMessage(socket, io);
        this.chatEvents.deleteChat(socket, io);
        this.chatEvents.joinGroupRoom(socket);
    };
}
exports.ChatGateway = ChatGateway;
