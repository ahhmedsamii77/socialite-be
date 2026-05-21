import { Router } from "express";
import { authentication } from "../../middleware";
import NS from "./notification.service";

export const notificationRouter = Router();

// get notifications (paginated)
notificationRouter.get("/", authentication(), NS.getNotifications);

// get unread count
notificationRouter.get("/unread-count", authentication(), NS.getUnreadCount);

// mark all as read
notificationRouter.patch("/mark-all-read", authentication(), NS.markAllRead);

// mark one as read
notificationRouter.patch("/:notificationId/read", authentication(), NS.markOneRead);

// delete one
notificationRouter.delete("/:notificationId", authentication(), NS.deleteOne);

// clear all
notificationRouter.delete("/", authentication(), NS.clearAll);
