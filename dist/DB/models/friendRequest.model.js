"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendRequestModel = void 0;
const mongoose_1 = require("mongoose");
const friendRequestSchema = new mongoose_1.Schema({
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    sendTo: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reStoredAt: { type: Date },
    reStoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    },
    strictQuery: true,
});
exports.friendRequestModel = mongoose_1.models.FriendRequest || (0, mongoose_1.model)("FriendRequest", friendRequestSchema);
