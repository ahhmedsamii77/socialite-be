import { z } from "zod";
import { generalRules } from "../../utils/generalRules";

// ─── OVO: Get direct chat ────────────────────────────────────────────────────
export const getChatSchema = {
  params: z.strictObject({
    userId: generalRules._id,
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
    .optional(),
};

// ─── OVM: Create group ───────────────────────────────────────────────────────
export const createGroupSchema = {
  body: z.object({
    groupName: z.string().min(1).max(100),
    participants: z.preprocess(
      (val) => (Array.isArray(val) ? val : [val]),
      z.array(generalRules._id).min(1, "A group needs at least 1 other participant"),
    ),
  }),
};

// ─── OVM: Get group chat ─────────────────────────────────────────────────────
export const getGroupChatSchema = {
  params: z.strictObject({
    chatId: generalRules._id,
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
    .optional(),
};

// ─── Delete message ──────────────────────────────────────────────────────────
export const deleteMessageSchema = {
  params: z.strictObject({
    chatId: generalRules._id,
    messageId: generalRules._id,
  }),
};

// ─── Delete / leave chat (OVO soft-delete or group leave) ────────────────────
export const deleteChatSchema = {
  params: z.strictObject({
    chatId: generalRules._id,
  }),
};

// ─── Update group (name / image) ─────────────────────────────────────────────
export const updateGroupSchema = {
  params: z.strictObject({
    chatId: generalRules._id,
  }),
  body: z
    .object({
      groupName: z.string().min(1).max(100).optional(),
      removeImage: z
        .string()
        .optional()
        .transform((v) => v === "true"),
    })
    .optional(),
};
// ─── Add participant to group ──────────────────────────────────────────────────
export const addParticipantSchema = {
  params: z.strictObject({
    chatId: generalRules._id,
  }),
  body: z.strictObject({
    userId: generalRules._id,
  }),
};
