"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const notification_service_1 = __importDefault(require("./notification.service"));
exports.notificationRouter = (0, express_1.Router)();
exports.notificationRouter.get("/", (0, middleware_1.authentication)(), notification_service_1.default.getNotifications);
exports.notificationRouter.get("/unread-count", (0, middleware_1.authentication)(), notification_service_1.default.getUnreadCount);
exports.notificationRouter.patch("/mark-all-read", (0, middleware_1.authentication)(), notification_service_1.default.markAllRead);
exports.notificationRouter.patch("/:notificationId/read", (0, middleware_1.authentication)(), notification_service_1.default.markOneRead);
exports.notificationRouter.delete("/:notificationId", (0, middleware_1.authentication)(), notification_service_1.default.deleteOne);
exports.notificationRouter.delete("/", (0, middleware_1.authentication)(), notification_service_1.default.clearAll);
