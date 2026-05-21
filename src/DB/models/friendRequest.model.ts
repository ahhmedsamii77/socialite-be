import { HydratedDocument, model, models, Schema } from "mongoose";
import { FriendRequestType } from "../../utils/types";

const friendRequestSchema = new Schema<FriendRequestType>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sendTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reStoredAt: { type: Date },
    reStoredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
    strictQuery: true,
  },
);

export type HFriendRequestDocument = HydratedDocument<FriendRequestType>;

export const friendRequestModel =
  models.FriendRequest || model<FriendRequestType>("FriendRequest", friendRequestSchema);
