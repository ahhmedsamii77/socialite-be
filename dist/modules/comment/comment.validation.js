"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommentSchema = exports.reStoreCommentSchema = exports.freezeCommentSchema = exports.getRepliesSchema = exports.getCommentsSchema = exports.updateCommentSchema = exports.likeCommentSchema = exports.createReplySchema = exports.createCommentSchema = void 0;
const zod_1 = require("zod");
const generalRules_1 = require("../../utils/generalRules");
exports.createCommentSchema = {
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
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
    }),
};
exports.createReplySchema = {
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
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
        commentId: generalRules_1.generalRules._id,
    }),
};
exports.likeCommentSchema = {
    params: zod_1.z.strictObject({
        commentId: generalRules_1.generalRules._id,
        postId: generalRules_1.generalRules._id,
    }),
};
exports.updateCommentSchema = {
    body: zod_1.z
        .strictObject({
        content: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z
            .string()
            .min(1, { error: "Content must be at least 1 characters" })
            .max(500000, { error: "Content must be at most 500000 characters" })
            .optional()),
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
    })
        .superRefine((data, ctx) => {
        if (Object.values(data).length === 0) {
            ctx.addIssue({
                code: "custom",
                message: "at least one field is required",
                path: ["content", "attachments", "tags"],
            });
        }
    }),
    params: zod_1.z.strictObject({
        commentId: generalRules_1.generalRules._id,
        postId: generalRules_1.generalRules._id,
    }),
};
exports.getCommentsSchema = {
    params: zod_1.z.strictObject({
        postId: generalRules_1.generalRules._id,
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
        .superRefine((data, ctx) => {
        if (data.cursor && data.after) {
            ctx.addIssue({
                code: "custom",
                message: "cursor and after are not allowed together",
                path: ["cursor", "after"],
            });
        }
    }),
};
exports.getRepliesSchema = {
    params: zod_1.z.strictObject({
        commentId: generalRules_1.generalRules._id,
        postId: generalRules_1.generalRules._id,
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
        .superRefine((data, ctx) => {
        if (data.cursor && data.after) {
            ctx.addIssue({
                code: "custom",
                message: "cursor and after are not allowed together",
                path: ["cursor", "after"],
            });
        }
    }),
};
exports.freezeCommentSchema = {
    params: zod_1.z.strictObject({
        commentId: generalRules_1.generalRules._id,
        postId: generalRules_1.generalRules._id,
    }),
};
exports.reStoreCommentSchema = {
    params: zod_1.z.strictObject({
        commentId: generalRules_1.generalRules._id,
        postId: generalRules_1.generalRules._id,
    }),
};
exports.deleteCommentSchema = {
    params: zod_1.z.strictObject({
        commentId: generalRules_1.generalRules._id,
        postId: generalRules_1.generalRules._id,
    }),
};
