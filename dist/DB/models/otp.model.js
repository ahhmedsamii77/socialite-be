"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpModel = exports.otpSchema = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../../utils/types/types");
const events_1 = require("../../utils/events");
const security_1 = require("../../utils/security");
exports.otpSchema = new mongoose_1.Schema({
    code: { type: String, required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
    type: { type: String, enum: types_1.OtpTypeEnum, required: true },
    expireAt: { type: Date, required: true },
    isVerified: { type: Boolean },
}, {
    timestamps: true,
});
exports.otpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
exports.otpSchema.pre("save", async function () {
    this.wasNew = this.isNew;
    if (this.isModified("code")) {
        this.plainCode = this.code;
        this.code = await (0, security_1.generateHash)(this.code);
        await this.populate({
            path: "userId",
            select: "email",
        });
    }
});
exports.otpSchema.post("save", async function () {
    if (this.wasNew) {
        events_1.eventEmitter.emit(this.type, {
            email: this.userId.email,
            otp: this.plainCode,
        });
    }
});
exports.OtpModel = mongoose_1.models.Otp || (0, mongoose_1.model)("Otp", exports.otpSchema);
