"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvents = void 0;
const chat_service_1 = require("./chat.service");
class ChatEvents {
    _chatService = new chat_service_1.ChatService();
    constructor() { }
    sendMessage = (socket, io) => {
        socket.on("sendMessage", (data) => {
            this._chatService.sendMessage({ ...data, socket, io });
        });
    };
    sendGroupMessage = (socket, io) => {
        socket.on("sendGroupMessage", (data) => {
            this._chatService.sendGroupMessage({ ...data, socket, io });
        });
    };
    deleteMessage = (socket, io) => {
        socket.on("deleteMessage", (data) => {
            this._chatService.deleteMessageSocket({ ...data, socket, io });
        });
    };
    deleteChat = (socket, io) => {
        socket.on("deleteChat", (data) => {
            this._chatService.deleteChatSocket({ ...data, socket, io });
        });
    };
    joinGroupRoom = (socket) => {
        socket.on("joinGroupRoom", ({ roomId }) => {
            if (roomId)
                socket.join(roomId);
        });
    };
}
exports.ChatEvents = ChatEvents;
