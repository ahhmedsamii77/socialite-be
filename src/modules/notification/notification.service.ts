import type { Request, Response } from "express";
import { NotificationRepository } from "../../DB/repositories";
import {
  notificationModel,
  NotificationTypeEnum,
} from "../../DB/models/notification.model";
import { Types } from "mongoose";
import { successResponse } from "../../utils/res";
import { NotFoundException } from "../../utils/res/res.error";
import { io } from "../gateway";


export async function createNotification(payload: {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: NotificationTypeEnum;
  message: string;
  refId?: Types.ObjectId;
  refModel?: string;
}) {
  if (payload.recipient.toString() === payload.sender.toString()) return;
  const repo = new NotificationRepository(notificationModel);
  const notification = await repo.create(payload);
  await notification.populate({
    path: "sender",
    select: "username profileImage fName lName",
  });
  io.to(payload.recipient.toString()).emit("new_notification", notification);
  return notification;
}

class NotificationService {
  private _notificationModel = new NotificationRepository(notificationModel);

  /** GET /notification  — cursor-paginated, newest first */
  getNotifications = async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const filter: any = { recipient: req.user!._id };
    if (cursor) filter.createdAt = { $lt: new Date(cursor) };

    const notifications = await notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate("sender", "username profileImage fName lName");

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore
      ? (items[items.length - 1] as any).createdAt.toISOString()
      : null;
    return successResponse({ res, data: { notifications: items, nextCursor } });
  };

  /** GET /notification/unread-count */
  getUnreadCount = async (req: Request, res: Response) => {
    const count = await notificationModel.countDocuments({
      recipient: req.user!._id,
      isRead: false,
      deletedAt: { $exists: false },
    });
    return successResponse({ res, data: { count } });
  };

  /** PATCH /notification/mark-all-read */
  markAllRead = async (req: Request, res: Response) => {
    await notificationModel.updateMany(
      { recipient: req.user!._id, isRead: false },
      { isRead: true },
    );
    return successResponse({ res });
  };

  /** PATCH /notification/:notificationId/read */
  markOneRead = async (req: Request, res: Response) => {
    const notification = await this._notificationModel.findOneAndUpdate(
      {
        _id: req.params.notificationId as unknown as Types.ObjectId,
        recipient: req.user!._id,
      },
      { isRead: true },
    );
    if (!notification) throw new NotFoundException("Notification not found.");
    return successResponse({ res });
  };

  /** DELETE /notification/:notificationId */
  deleteOne = async (req: Request, res: Response) => {
    const notification = await this._notificationModel.findOneAndUpdate(
      {
        _id: req.params.notificationId as unknown as Types.ObjectId,
        recipient: req.user!._id,
        deletedAt: { $exists: false },
      },
      { deletedAt: new Date() },
    );
    if (!notification) throw new NotFoundException("Notification not found.");
    return successResponse({ res });
  };

  /** DELETE /notification — clear all for current user */
  clearAll = async (req: Request, res: Response) => {
    await notificationModel.updateMany(
      { recipient: req.user!._id, deletedAt: { $exists: false } },
      { deletedAt: new Date() },
    );
    return successResponse({ res });
  };
}

export default new NotificationService();
export { NotificationTypeEnum };
