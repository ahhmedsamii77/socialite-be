import { models, Schema, model } from "mongoose";
import { RevokeTokenType } from "../../utils/types/types";

export const revokeTokenSchema = new Schema<RevokeTokenType>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expireIn: { type: Date, required: true },
    jti: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

revokeTokenSchema.index({ expireIn: 1 }, { expireAfterSeconds: 0 });

export const revokeTokenModel = models.RevokeToken || model("RevokeToken", revokeTokenSchema);
