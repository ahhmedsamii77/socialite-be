"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeTokenModel = exports.revokeTokenSchema = void 0;
const mongoose_1 = require("mongoose");
exports.revokeTokenSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    expireIn: { type: Date, required: true },
    jti: { type: String, required: true },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    },
});
exports.revokeTokenSchema.index({ expireIn: 1 }, { expireAfterSeconds: 0 });
exports.revokeTokenModel = mongoose_1.models.RevokeToken || (0, mongoose_1.model)("RevokeToken", exports.revokeTokenSchema);
