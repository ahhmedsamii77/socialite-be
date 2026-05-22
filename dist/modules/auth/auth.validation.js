"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.verifyResetPasswordOtpSchema = exports.forgetPasswordSchema = exports.gmailSchema = exports.signinSchema = exports.confirmEmailSchema = exports.reSendOtpSchema = exports.signUpSchema = void 0;
const zod_1 = require("zod");
const generalRules_1 = require("../../utils/generalRules");
const types_1 = require("../../utils/types/types");
exports.signUpSchema = {
    body: zod_1.z
        .strictObject({
        username: generalRules_1.generalRules.fullName,
        email: generalRules_1.generalRules.email,
        password: generalRules_1.generalRules.password,
        confirmPassword: generalRules_1.generalRules.password,
        phone: generalRules_1.generalRules.phone.optional(),
        address: zod_1.z
            .string()
            .min(3, { error: "Address must be at least 3 characters" })
            .max(20, { error: "Address must be at most 20 characters" })
            .optional(),
        gender: zod_1.z.enum(types_1.GenderEnum, { error: "Invalid gender" }).optional(),
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }),
};
exports.reSendOtpSchema = {
    body: zod_1.z.strictObject({
        email: generalRules_1.generalRules.email,
    }),
};
exports.confirmEmailSchema = {
    body: zod_1.z.strictObject({
        email: generalRules_1.generalRules.email,
        otp: zod_1.z.string().length(6, { error: "OTP must be 6 characters" }),
    }),
};
exports.signinSchema = {
    body: zod_1.z.strictObject({
        email: generalRules_1.generalRules.email,
        password: generalRules_1.generalRules.password,
    }),
};
exports.gmailSchema = {
    body: zod_1.z.strictObject({
        idToken: zod_1.z.string(),
    }),
};
exports.forgetPasswordSchema = {
    body: zod_1.z.strictObject({
        email: generalRules_1.generalRules.email,
    }),
};
exports.verifyResetPasswordOtpSchema = {
    body: zod_1.z.strictObject({
        email: generalRules_1.generalRules.email,
        otp: zod_1.z.string().length(6, { error: "OTP must be 6 characters" }),
    }),
};
exports.resetPasswordSchema = {
    body: zod_1.z.strictObject({
        email: generalRules_1.generalRules.email,
        password: generalRules_1.generalRules.password,
        confirmPassword: generalRules_1.generalRules.password,
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }),
};
