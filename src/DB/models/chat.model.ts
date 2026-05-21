import { model, models, Schema, HydratedDocument, Query } from "mongoose";
import { ChatType, MessageType } from "../../utils/types";

const messageSchema = new Schema<MessageType>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: {
      type: String,
      minlength: 1,
      maxlength: 500000,
      required: function (this: MessageType) {
        return this?.attachments?.length === 0;
      },
    },
    attachments: { type: [String] },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const chatSchema = new Schema<ChatType>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomId: {
      type: String,
      required: function (this: ChatType) {
        return this?.groupName ? true : false;
      },
    },
    participants: { type: [Schema.Types.ObjectId], ref: "User" },
    groupImage: { type: String },
    groupName: { type: String },
    messages: { type: [messageSchema], default: [] },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

chatSchema.pre<Query<ChatType, any>>(/^find/, async function () {
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

export type HChatDocument = HydratedDocument<ChatType>;

export const chatModel = models.Chat || model<ChatType>("Chat", chatSchema);
