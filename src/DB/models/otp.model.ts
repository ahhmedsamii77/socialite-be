import { model, models, Schema } from "mongoose";
import { OtpTypeEnum, OtpType } from "../../utils/types/types";
import { HydratedDocument } from "mongoose";
import { eventEmitter } from "../../utils/events";
import { generateHash } from "../../utils/security";

export const otpSchema = new Schema<OtpType>(
  {
    code: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    type: { type: String, enum: OtpTypeEnum, required: true },
    expireAt: { type: Date, required: true },
    isVerified: { type: Boolean },
  },
  {
    timestamps: true,
  },
);

otpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.pre(
  "save",
  async function (this: HOtpDocument & { wasNew: boolean; plainCode: string }) {
    this.wasNew = this.isNew;
    if (this.isModified("code")) {
      this.plainCode = this.code;
      this.code = await generateHash(this.code);
      await this.populate({
        path: "userId",
        select: "email",
      });
    }
  },
);

otpSchema.post(
  "save",
  async function (
    this: HOtpDocument & {
      wasNew: boolean;
      plainCode: string;
      userId: { email: string };
    },
  ) {
    if (this.wasNew) {
      eventEmitter.emit(this.type, {
        email: this.userId.email,
        otp: this.plainCode,
      });
    }
  },
);

export const OtpModel = models.Otp || model<OtpType>("Otp", otpSchema);

export type HOtpDocument = HydratedDocument<OtpType>;
