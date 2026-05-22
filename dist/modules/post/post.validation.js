"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPostSchema = exports.sharePostSchema = exports.deletePostSchema = exports.reStorePostSchema = exports.freezePostSchema = exports.savedPostsSchema = exports.getPostsSchema = exports.updatedPostSchema = exports.likePostSchema = exports.createPostSchema = void 0;
const zod_1 = require("zod");
const generalRules_1 = require("../../utils/generalRules");
const types_1 = require("../../utils/types");
exports.createPostSchema = {
    body: zod_1.z
        .strictObject({
        content: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z
            .string()
            .min(1, { error: "Content must be at least 1 characters" })
            .max(500000, { error: "Content must be at most 500000 characters" })
            .optional()),
        attachments: zod_1.z.array(generalRules_1.generalRules.file).max(2).optional(),
        tags: zod_1.z
            .preprocess((val) => {
            if (typeof val === "string")
                return [val];
            return val;
        }, zod_1.z
            .array(generalRules_1.generalRules._id)
            .refine((value) => new Set(value).size === value.length, {
            message: "Duplicate tags are not allowed",
            path: ["tags"],
        }))
            .optional(),
        allowComments: zod_1.z
            .enum(types_1.AllowCommentsEnum, { error: "Invalid allowComments" })
            .optional(),
        availability: zod_1.z
            .enum(types_1.AvailabilityEnum, { error: "Invalid availability" })
            .optional(),
    })
        .superRefine((data, ctx) => {
        if (!data.content && data.attachments?.length === 0) {
            ctx.addIssue({
                code: "custom",
                message: "Content or attachments is required",
                path: ["content", "attachments"],
            });
        }
    }),
};
exports.likePostSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
exports.updatedPostSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
    body: zod_1.z.strictObject({
        content: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z
            .string()
            .min(1, { error: "Content must be at least 1 characters" })
            .max(500000, { error: "Content must be at most 500000 characters" })
            .optional()),
        allowComments: zod_1.z
            .enum(types_1.AllowCommentsEnum, { error: "Invalid allowComments" })
            .optional(),
        availability: zod_1.z
            .enum(types_1.AvailabilityEnum, { error: "Invalid availability" })
            .optional(),
        attachments: zod_1.z.array(generalRules_1.generalRules.file).max(2).optional(),
        removedAttachments: zod_1.z.array(zod_1.z.string()).optional(),
        tags: zod_1.z
            .preprocess((val) => {
            if (typeof val === "string")
                return [val];
            return val;
        }, zod_1.z
            .array(generalRules_1.generalRules._id)
            .refine((value) => new Set(value).size === value.length, {
            message: "Duplicate tags are not allowed",
            path: ["tags"],
        }))
            .optional(),
        removedTags: zod_1.z.array(generalRules_1.generalRules._id).optional(),
    }),
};
exports.getPostsSchema = {
    query: zod_1.z.strictObject({
        cursor: zod_1.z.string().optional(),
        after: zod_1.z.string().optional(),
        limit: zod_1.z
            .string()
            .transform((val) => Number(val))
            .refine((val) => !isNaN(val), { message: "limit must be a number" })
            .pipe(zod_1.z.number().min(1).max(100))
            .optional(),
    }),
};
exports.savedPostsSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
exports.freezePostSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
exports.reStorePostSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
exports.deletePostSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
exports.sharePostSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
exports.GetPostSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
