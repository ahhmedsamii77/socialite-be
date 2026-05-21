import { model, models, Schema, HydratedDocument, Query } from "mongoose";
import { CommentType } from "../../utils/types";

export const commentSchema = new Schema<CommentType>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: {
      type: String,
      minlength: 1,
      maxlength: 500000,
      required: function (this: CommentType) {
        return this?.attachments?.length === 0;
      },
    },
    attachments: { type: [String] },
    likes: { type: [Schema.Types.ObjectId], ref: "User" },
    tags: { type: [Schema.Types.ObjectId], ref: "User" },
    postId: { type: Schema.Types.ObjectId, required: true, refPath: "Post" },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reStoredAt: { type: Date },
    reStoredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "commentId",
});

commentSchema.pre<Query<CommentType, any>>(/^find/, async function () {
  const query = this.getQuery();
  const { paranoid, ...rest } = query;
  if (paranoid === false) {
    this.setQuery({ ...rest });
  } else {
    this.setQuery({
      ...query,
      deletedAt: { $exists: false },
    });
  }
});

commentSchema.post(
  "updateOne",
  async function (
    this: Query<any, CommentType>,
    result: { modifiedCount?: number },
  ) {
    if (!result?.modifiedCount) return;

    const update = this.getUpdate() as Record<string, any>;
    const deletedAt: Date | undefined =
      update?.deletedAt ?? update?.$set?.deletedAt;
    const deletedBy: unknown = update?.deletedBy ?? update?.$set?.deletedBy;
    if (!deletedAt) return;

    const commentId = this.getFilter()?._id;
    if (!commentId) return;

    const doc = await commentModel.findOne(
      { _id: commentId, paranoid: false },
      { commentId: 1 },
      { lean: true },
    )  as unknown as CommentType;

    if (!doc || doc.commentId) return;

    await commentModel.updateMany(
      { commentId, deletedAt: { $exists: false } },
      {
        $set: { deletedAt, deletedBy },
        $unset: { reStoredAt: "", reStoredBy: "" },
      },
    ) as unknown as any; 
  },
);

export type HCommentDocument = HydratedDocument<CommentType>;

export const commentModel =
  models.Comment || model<CommentType>("Comment", commentSchema);
