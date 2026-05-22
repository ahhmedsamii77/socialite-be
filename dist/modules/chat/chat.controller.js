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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const middleware_1 = require("../../middleware");
const chat_service_1 = require("./chat.service");
const CV = __importStar(require("./chat.validation"));
exports.chatRouter = (0, express_1.Router)();
const CS = new chat_service_1.ChatService();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.chatRouter.get("/", (0, middleware_1.authentication)(), CS.getUserChats);
exports.chatRouter.get("/ovo/:userId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.getChatSchema), CS.getChat);
exports.chatRouter.delete("/ovo/:chatId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.deleteChatSchema), CS.deleteChat);
exports.chatRouter.delete("/:chatId/messages/:messageId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.deleteMessageSchema), CS.deleteMessage);
exports.chatRouter.post("/group", (0, middleware_1.authentication)(), upload.single("groupImage"), (0, middleware_1.validation)(CV.createGroupSchema), CS.createGroup);
exports.chatRouter.get("/group/:chatId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.getGroupChatSchema), CS.getGroupChat);
exports.chatRouter.get("/group/:chatId/participants", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.getGroupChatSchema), CS.getGroupParticipants);
exports.chatRouter.patch("/group/:chatId", (0, middleware_1.authentication)(), upload.single("groupImage"), (0, middleware_1.validation)(CV.updateGroupSchema), CS.updateGroup);
exports.chatRouter.delete("/group/:chatId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.deleteChatSchema), CS.deleteGroup);
exports.chatRouter.patch("/:chatId/freeze", (0, middleware_1.authentication)(), CS.freezeChat);
exports.chatRouter.patch("/:chatId/restore", (0, middleware_1.authentication)(), CS.restoreChat);
exports.chatRouter.delete("/:chatId/hard", (0, middleware_1.authentication)(), CS.hardDeleteChat);
