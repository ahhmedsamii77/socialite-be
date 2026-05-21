import { HydratedDocument, model, models, Schema, Query } from "mongoose";
import {
  AllowCommentsEnum,
  AvailabilityEnum,
  PostType,
} from "../../utils/types";


export const postSchema = new Schema<PostType>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: {
      type: String,
      minlength: 1,
      maxlength: 500000,
      required: function (this: PostType) {
        return this?.attachments?.length === 0;
      },
    },
    attachments: { type: [String] },
    tags: { type: [Schema.Types.ObjectId], ref: "User" },
    likes: { type: [Schema.Types.ObjectId], ref: "User" },
    allowComments: {
      type: String,
      enum: AllowCommentsEnum,
      default: AllowCommentsEnum.ALLOW,
    },
    availability: {
      type: String,
      enum: AvailabilityEnum,
      default: AvailabilityEnum.PUBLIC,
    },
    assetsFolderId: { type: String },
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

export type HPostDocument = HydratedDocument<PostType>;

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "postId",
  justOne: true,
});

postSchema.pre<Query<PostType, any>>(/^find/, async function () {
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


export const postModel = models.Post || model<PostType>("Post", postSchema);
