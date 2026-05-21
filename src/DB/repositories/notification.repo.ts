import { Model } from "mongoose";
import { NotificationType } from "../models/notification.model";
import { DBRepository } from "./db.repo";

export class NotificationRepository extends DBRepository<NotificationType> {
  constructor(protected override readonly model: Model<NotificationType>) {
    super(model);
  }
}
