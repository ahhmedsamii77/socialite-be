"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatModel = exports.chatSchema = void 0;
const mongoose_1 = require("mongoose");
const messageSchema = new mongoose_1.Schema({
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    content: {
        type: String,
        minlength: 1,
        maxlength: 500000,
        required: function () {
            return this?.attachments?.length === 0;
        },
    },
    attachments: { type: [String] },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
exports.chatSchema = new mongoose_1.Schema({
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    roomId: {
        type: String,
        required: function () {
            return this?.groupName ? true : false;
        },
    },
    participants: { type: [mongoose_1.Schema.Types.ObjectId], ref: "User" },
    groupImage: { type: String },
    groupName: { type: String },
    messages: { type: [messageSchema], default: [] },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
exports.chatSchema.pre(/^find/, async function () {
    const query = this.getQuery();
    const { paranoid, ...rest } = query;
    if (paranoid === false) {
        this.setQuery({ ...rest });
    }
    else {
        this.setQuery({
            ...query,
            deletedAt: { $exists: false },
        });
    }
});
exports.chatModel = mongoose_1.models.Chat || (0, mongoose_1.model)("Chat", exports.chatSchema);
