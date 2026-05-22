"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentModel = exports.commentSchema = void 0;
const mongoose_1 = require("mongoose");
exports.commentSchema = new mongoose_1.Schema({
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
    likes: { type: [mongoose_1.Schema.Types.ObjectId], ref: "User" },
    tags: { type: [mongoose_1.Schema.Types.ObjectId], ref: "User" },
    postId: { type: mongoose_1.Schema.Types.ObjectId, required: true, refPath: "Post" },
    commentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Comment",
    },
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
exports.commentSchema.virtual("replies", {
    ref: "Comment",
    localField: "_id",
    foreignField: "commentId",
});
exports.commentSchema.pre(/^find/, async function () {
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
exports.commentSchema.post("updateOne", async function (result) {
    if (!result?.modifiedCount)
        return;
    const update = this.getUpdate();
    const deletedAt = update?.deletedAt ?? update?.$set?.deletedAt;
    const deletedBy = update?.deletedBy ?? update?.$set?.deletedBy;
    if (!deletedAt)
        return;
    const commentId = this.getFilter()?._id;
    if (!commentId)
        return;
    const doc = await exports.commentModel.findOne({ _id: commentId, paranoid: false }, { commentId: 1 }, { lean: true });
    if (!doc || doc.commentId)
        return;
    await exports.commentModel.updateMany({ commentId, deletedAt: { $exists: false } }, {
        $set: { deletedAt, deletedBy },
        $unset: { reStoredAt: "", reStoredBy: "" },
    });
});
exports.commentModel = mongoose_1.models.Comment || (0, mongoose_1.model)("Comment", exports.commentSchema);
