"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFriendSchema = exports.rejectRequestSchema = exports.acceptRequestSchema = exports.sendRequestSchema = exports.changeRoleSchema = exports.hardDeleteAccountSchema = exports.reStoreAccountSchema = exports.freezeAccountSchema = exports.updateProfileSchema = exports.shareProfileSchema = exports.updatePasswordSchema = exports.logoutSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../../utils/types/types");
const generalRules_1 = require("../../utils/generalRules");
exports.logoutSchema = {
    body: zod_1.z.strictObject({
        flag: zod_1.z
            .enum(types_1.FlagTypeEnum, { error: "Invalid flag" })
            .default(types_1.FlagTypeEnum.SINGLE),
    }),
};
exports.updatePasswordSchema = {
    body: zod_1.z
        .strictObject({
        currentPassword: generalRules_1.generalRules.password,
        newPassword: generalRules_1.generalRules.password,
        confirmNewPassword: generalRules_1.generalRules.password,
    })
        .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "New passwords do not match",
        path: ["confirmNewPassword"],
    }),
};
exports.shareProfileSchema = {
    params: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id,
    }),
};
exports.updateProfileSchema = {
    body: zod_1.z.strictObject({
        fName: generalRules_1.generalRules.fName.optional(),
        lName: generalRules_1.generalRules.lName.optional(),
        username: zod_1.z
            .string()
            .min(3, { error: "Username must be at least 3 characters" })
            .max(20, { error: "Username must be at most 20 characters" })
            .optional(),
        phone: generalRules_1.generalRules.phone.optional(),
        address: zod_1.z
            .string()
            .max(100, { error: "Address must be at most 100 characters" })
            .optional(),
        email: generalRules_1.generalRules.email.optional(),
        gender: zod_1.z.enum(types_1.GenderEnum, { error: "Invalid gender" }).optional(),
    }),
};
exports.freezeAccountSchema = {
    params: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id.optional(),
    }),
};
exports.reStoreAccountSchema = {
    params: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id,
    }),
};
exports.hardDeleteAccountSchema = {
    params: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id,
    }),
};
exports.changeRoleSchema = {
    params: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id,
    }),
    body: zod_1.z.strictObject({
        role: zod_1.z.enum(types_1.RoleEnum, { error: "Invalid role" }),
    }),
};
exports.sendRequestSchema = {
    params: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id,
    }),
};
exports.acceptRequestSchema = {
    params: zod_1.z.strictObject({
        requestId: generalRules_1.generalRules._id,
    }),
};
exports.rejectRequestSchema = {
    params: zod_1.z.strictObject({
        requestId: generalRules_1.generalRules._id,
    }),
};
exports.removeFriendSchema = {
    params: zod_1.z.strictObject({
        friendId: generalRules_1.generalRules._id,
    }),
};
