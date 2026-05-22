"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postModel = exports.postSchema = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../../utils/types");
exports.postSchema = new mongoose_1.Schema({
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
    tags: { type: [mongoose_1.Schema.Types.ObjectId], ref: "User" },
    likes: { type: [mongoose_1.Schema.Types.ObjectId], ref: "User" },
    allowComments: {
        type: String,
        enum: types_1.AllowCommentsEnum,
        default: types_1.AllowCommentsEnum.ALLOW,
    },
    availability: {
        type: String,
        enum: types_1.AvailabilityEnum,
        default: types_1.AvailabilityEnum.PUBLIC,
    },
    assetsFolderId: { type: String },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reStoredAt: { type: Date },
    reStoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    strictQuery: true,
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    },
});
exports.postSchema.virtual("comments", {
    ref: "Comment",
    localField: "_id",
    foreignField: "postId",
    justOne: true,
});
exports.postSchema.pre(/^find/, async function () {
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
exports.postModel = mongoose_1.models.Post || (0, mongoose_1.model)("Post", exports.postSchema);
