import { HydratedDocument, model, models, Query, Schema, Types } from "mongoose";

export enum NotificationTypeEnum {
  FRIEND_REQUEST = "friend_request",
  FRIEND_ACCEPTED = "friend_accepted",
  POST_LIKE = "post_like",
  POST_COMMENT = "post_comment",
  COMMENT_LIKE = "comment_like",
  COMMENT_REPLY = "comment_reply",
}

export interface NotificationType {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;   
  sender: Types.ObjectId;     
  type: NotificationTypeEnum;
  message: string;
  isRead: boolean;
  refId?: Types.ObjectId;      
  refModel?: string;          
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type HNotificationDocument = HydratedDocument<NotificationType>;

const notificationSchema = new Schema<NotificationType>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:      { type: String, enum: Object.values(NotificationTypeEnum), required: true },
    message:   { type: String, required: true },
    isRead:    { type: Boolean, default: false },
    refId:     { type: Schema.Types.ObjectId },
    refModel:  { type: String },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// Auto-expire notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Paranoid: automatically exclude soft-deleted notifications from all find queries
notificationSchema.pre<Query<NotificationType, any>>(/^find/, function () {
  const query = this.getQuery();
  const { paranoid, ...rest } = query;
  if (paranoid === false) {
    this.setQuery({ ...rest });
  } else {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

export const notificationModel =
  models.Notification ||
  model<NotificationType>("Notification", notificationSchema);
