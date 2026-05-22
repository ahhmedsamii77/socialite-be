"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addParticipantSchema = exports.updateGroupSchema = exports.deleteChatSchema = exports.deleteMessageSchema = exports.getGroupChatSchema = exports.createGroupSchema = exports.getChatSchema = void 0;
const zod_1 = require("zod");
const generalRules_1 = require("../../utils/generalRules");
exports.getChatSchema = {
    params: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id,
    }),
    query: zod_1.z
        .strictObject({
        cursor: zod_1.z.string().optional(),
        after: zod_1.z.string().optional(),
        limit: zod_1.z
            .string()
            .transform((val) => Number(val))
            .refine((val) => !isNaN(val), { message: "limit must be a number" })
            .pipe(zod_1.z.number().min(1).max(100))
            .optional(),
    })
        .optional(),
};
exports.createGroupSchema = {
    body: zod_1.z.object({
        groupName: zod_1.z.string().min(1).max(100),
        participants: zod_1.z.preprocess((val) => (Array.isArray(val) ? val : [val]), zod_1.z.array(generalRules_1.generalRules._id).min(1, "A group needs at least 1 other participant")),
    }),
};
exports.getGroupChatSchema = {
    params: zod_1.z.strictObject({
        chatId: generalRules_1.generalRules._id,
    }),
    query: zod_1.z
        .strictObject({
        cursor: zod_1.z.string().optional(),
        after: zod_1.z.string().optional(),
        limit: zod_1.z
            .string()
            .transform((val) => Number(val))
            .refine((val) => !isNaN(val), { message: "limit must be a number" })
            .pipe(zod_1.z.number().min(1).max(100))
            .optional(),
    })
        .optional(),
};
exports.deleteMessageSchema = {
    params: zod_1.z.strictObject({
        chatId: generalRules_1.generalRules._id,
        messageId: generalRules_1.generalRules._id,
    }),
};
exports.deleteChatSchema = {
    params: zod_1.z.strictObject({
        chatId: generalRules_1.generalRules._id,
    }),
};
exports.updateGroupSchema = {
    params: zod_1.z.strictObject({
        chatId: generalRules_1.generalRules._id,
    }),
    body: zod_1.z
        .object({
        groupName: zod_1.z.string().min(1).max(100).optional(),
        removeImage: zod_1.z
            .string()
            .optional()
            .transform((v) => v === "true"),
    })
        .optional(),
};
exports.addParticipantSchema = {
    params: zod_1.z.strictObject({
        chatId: generalRules_1.generalRules._id,
    }),
    body: zod_1.z.strictObject({
        userId: generalRules_1.generalRules._id,
    }),
};
