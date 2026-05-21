import { z } from "zod";
import { generalRules } from "../../utils/generalRules";

export const createCommentSchema = {
  body: z
    .strictObject({
      content: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z
          .string()
          .min(1, { error: "Content must be at least 1 characters" })
          .max(500000, { error: "Content must be at most 500000 characters" })
          .optional(),
      ),
      attachments: z.array(generalRules.file).max(2).optional(),
      tags: z
        .preprocess(
          (val) => {
            if (typeof val === "string") return [val];
            return val;
          },
          z
            .array(generalRules._id)
            .refine((value) => new Set(value).size === value.length, {
              message: "Duplicate tags are not allowed",
              path: ["tags"],
            }),
        )
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
  params: z.strictObject({
    postId: generalRules._id,
  }),
};

export const createReplySchema = {
  body: z
    .strictObject({
      content: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z
          .string()
          .min(1, { error: "Content must be at least 1 characters" })
          .max(500000, { error: "Content must be at most 500000 characters" })
          .optional(),
      ),
      attachments: z.array(generalRules.file).max(2).optional(),
      tags: z
        .preprocess(
          (val) => {
            if (typeof val === "string") return [val];
            return val;
          },
          z
            .array(generalRules._id)
            .refine((value) => new Set(value).size === value.length, {
              message: "Duplicate tags are not allowed",
              path: ["tags"],
            }),
        )
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
  params: z.strictObject({
    postId: generalRules._id,
    commentId: generalRules._id,
  }),
};

export const likeCommentSchema = {
  params: z.strictObject({
    commentId: generalRules._id,
    postId: generalRules._id,
  }),
};

export const updateCommentSchema = {
  body: z
    .strictObject({
      content: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z
          .string()
          .min(1, { error: "Content must be at least 1 characters" })
          .max(500000, { error: "Content must be at most 500000 characters" })
          .optional(),
      ),
      attachments: z.array(generalRules.file).max(2).optional(),
      removedAttachments: z.array(z.string()).optional(),
      tags: z
        .preprocess(
          (val) => {
            if (typeof val === "string") return [val];
            return val;
          },
          z
            .array(generalRules._id)
            .refine((value) => new Set(value).size === value.length, {
              message: "Duplicate tags are not allowed",
              path: ["tags"],
            }),
        )
        .optional(),
      removedTags: z.array(generalRules._id).optional(),
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
  params: z.strictObject({
    commentId: generalRules._id,
    postId: generalRules._id,
  }),
};

export const getCommentsSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
  query: z
    .strictObject({
      cursor: z.string().optional(),
      after: z.string().optional(),
      limit: z
        .string()
        .transform((val) => Number(val))
        .refine((val) => !isNaN(val), { message: "limit must be a number" })
        .pipe(z.number().min(1).max(100))
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

export const getRepliesSchema = {
  params: z.strictObject({
    commentId: generalRules._id,
    postId: generalRules._id,
  }),
  query: z
    .strictObject({
      cursor: z.string().optional(),
      after: z.string().optional(),
      limit: z
        .string()
        .transform((val) => Number(val))
        .refine((val) => !isNaN(val), { message: "limit must be a number" })
        .pipe(z.number().min(1).max(100))
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

export const freezeCommentSchema = {
  params: z.strictObject({
    commentId: generalRules._id,
    postId: generalRules._id,
  }),
};

export const reStoreCommentSchema = {
  params: z.strictObject({
    commentId: generalRules._id,
    postId: generalRules._id,
  }),
};

export const deleteCommentSchema = {
  params: z.strictObject({
    commentId: generalRules._id,
    postId: generalRules._id,
  }),
};
