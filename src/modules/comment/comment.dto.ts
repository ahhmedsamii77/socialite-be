import { z } from "zod";
import {
  createCommentSchema,
  createReplySchema,
  deleteCommentSchema,
  freezeCommentSchema,
  getCommentsSchema,
  getRepliesSchema,
  likeCommentSchema,
  reStoreCommentSchema,
  updateCommentSchema,
} from "./comment.validation";

export type CreateCommentBodyDto = z.infer<typeof createCommentSchema.body>;
export type CreateCommentParamsDto = z.infer<typeof createCommentSchema.params>;
export type CreateReplyBodyDto = z.infer<typeof createReplySchema.body>;
export type CreateReplyParamsDto = z.infer<typeof createReplySchema.params>;
export type LikeCommentDto = z.infer<typeof likeCommentSchema.params>;
export type UpdateCommentBodyDto = z.infer<typeof updateCommentSchema.body>;
export type UpdateCommentParamsDto = z.infer<typeof updateCommentSchema.params>;
export type GetCommentsParamsDto = z.infer<typeof getCommentsSchema.params>;
export type GetCommentsQueryDto = z.infer<typeof getCommentsSchema.query>;
export type GetRepliesParamsDto = z.infer<typeof getRepliesSchema.params>;
export type GetRepliesQueryDto = z.infer<typeof getRepliesSchema.query>;
export type FreezeCommentParamsDto = z.infer<typeof freezeCommentSchema.params>;
export type ReStoreCommentParamsDto = z.infer<
  typeof reStoreCommentSchema.params
>;
export type DeleteCommentParamsDto = z.infer<typeof deleteCommentSchema.params>;
