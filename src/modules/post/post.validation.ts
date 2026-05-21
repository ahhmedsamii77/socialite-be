import { z } from "zod";
import { generalRules } from "../../utils/generalRules";
import { AllowCommentsEnum, AvailabilityEnum } from "../../utils/types";

export const createPostSchema = {
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
      allowComments: z
        .enum(AllowCommentsEnum, { error: "Invalid allowComments" })
        .optional(),
      availability: z
        .enum(AvailabilityEnum, { error: "Invalid availability" })
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

export const likePostSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
};

export const updatedPostSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
  body: z.strictObject({
    content: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string()
        .min(1, { error: "Content must be at least 1 characters" })
        .max(500000, { error: "Content must be at most 500000 characters" })
        .optional(),
    ),
    allowComments: z
      .enum(AllowCommentsEnum, { error: "Invalid allowComments" })
      .optional(),
    availability: z
      .enum(AvailabilityEnum, { error: "Invalid availability" })
      .optional(),
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
  }),
};

export const getPostsSchema = {
  query: z.strictObject({
    cursor: z.string().optional(),
    after: z.string().optional(),
    limit: z
      .string()
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val), { message: "limit must be a number" })
      .pipe(z.number().min(1).max(100))
      .optional(),
  }),
};

export const savedPostsSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
};

export const freezePostSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
};

export const reStorePostSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
};

export const deletePostSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
};

export const sharePostSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
};

export const GetPostSchema = {
  params: z.strictObject({
    postId: generalRules._id,
  }),
};
