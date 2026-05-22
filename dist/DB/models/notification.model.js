"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationModel = exports.NotificationTypeEnum = void 0;
const mongoose_1 = require("mongoose");
var NotificationTypeEnum;
(function (NotificationTypeEnum) {
    NotificationTypeEnum["FRIEND_REQUEST"] = "friend_request";
    NotificationTypeEnum["FRIEND_ACCEPTED"] = "friend_accepted";
    NotificationTypeEnum["POST_LIKE"] = "post_like";
    NotificationTypeEnum["POST_COMMENT"] = "post_comment";
    NotificationTypeEnum["COMMENT_LIKE"] = "comment_like";
    NotificationTypeEnum["COMMENT_REPLY"] = "comment_reply";
})(NotificationTypeEnum || (exports.NotificationTypeEnum = NotificationTypeEnum = {}));
const notificationSchema = new mongoose_1.Schema({
    recipient: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(NotificationTypeEnum), required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    refId: { type: mongoose_1.Schema.Types.ObjectId },
    refModel: { type: String },
    deletedAt: { type: Date },
}, { timestamps: true });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.pre(/^find/, function () {
    const query = this.getQuery();
    const { paranoid, ...rest } = query;
    if (paranoid === false) {
        this.setQuery({ ...rest });
    }
    else {
        this.setQuery({ ...query, deletedAt: { $exists: false } });
    }
});
exports.notificationModel = mongoose_1.models.Notification ||
    (0, mongoose_1.model)("Notification", notificationSchema);
