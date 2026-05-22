"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationTypeEnum = void 0;
exports.createNotification = createNotification;
const repositories_1 = require("../../DB/repositories");
const notification_model_1 = require("../../DB/models/notification.model");
Object.defineProperty(exports, "NotificationTypeEnum", { enumerable: true, get: function () { return notification_model_1.NotificationTypeEnum; } });
const res_1 = require("../../utils/res");
const res_error_1 = require("../../utils/res/res.error");
const gateway_1 = require("../gateway");
async function createNotification(payload) {
    if (payload.recipient.toString() === payload.sender.toString())
        return;
    const repo = new repositories_1.NotificationRepository(notification_model_1.notificationModel);
    const notification = await repo.create(payload);
    await notification.populate({
        path: "sender",
        select: "username profileImage fName lName",
    });
    gateway_1.io.to(payload.recipient.toString()).emit("new_notification", notification);
    return notification;
}
class NotificationService {
    _notificationModel = new repositories_1.NotificationRepository(notification_model_1.notificationModel);
    getNotifications = async (req, res) => {
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const cursor = req.query.cursor;
        const filter = { recipient: req.user._id };
        if (cursor)
            filter.createdAt = { $lt: new Date(cursor) };
        const notifications = await notification_model_1.notificationModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate("sender", "username profileImage fName lName");
        const hasMore = notifications.length > limit;
        const items = hasMore ? notifications.slice(0, limit) : notifications;
        const nextCursor = hasMore
            ? items[items.length - 1].createdAt.toISOString()
            : null;
        return (0, res_1.successResponse)({ res, data: { notifications: items, nextCursor } });
    };
    getUnreadCount = async (req, res) => {
        const count = await notification_model_1.notificationModel.countDocuments({
            recipient: req.user._id,
            isRead: false,
            deletedAt: { $exists: false },
        });
        return (0, res_1.successResponse)({ res, data: { count } });
    };
    markAllRead = async (req, res) => {
        await notification_model_1.notificationModel.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
        return (0, res_1.successResponse)({ res });
    };
    markOneRead = async (req, res) => {
        const notification = await this._notificationModel.findOneAndUpdate({
            _id: req.params.notificationId,
            recipient: req.user._id,
        }, { isRead: true });
        if (!notification)
            throw new res_error_1.NotFoundException("Notification not found.");
        return (0, res_1.successResponse)({ res });
    };
    deleteOne = async (req, res) => {
        const notification = await this._notificationModel.findOneAndUpdate({
            _id: req.params.notificationId,
            recipient: req.user._id,
            deletedAt: { $exists: false },
        }, { deletedAt: new Date() });
        if (!notification)
            throw new res_error_1.NotFoundException("Notification not found.");
        return (0, res_1.successResponse)({ res });
    };
    clearAll = async (req, res) => {
        await notification_model_1.notificationModel.updateMany({ recipient: req.user._id, deletedAt: { $exists: false } }, { deletedAt: new Date() });
        return (0, res_1.successResponse)({ res });
    };
}
exports.default = new NotificationService();
