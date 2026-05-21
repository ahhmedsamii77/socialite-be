import { z } from "zod";
import {
  createPostSchema,
  deletePostSchema,
  freezePostSchema,
  GetPostSchema,
  getPostsSchema,
  likePostSchema,
  reStorePostSchema,
  savedPostsSchema,
  sharePostSchema,
  updatedPostSchema,
} from "./post.validation";

export type createPostDto = z.infer<typeof createPostSchema.body>;
export type LikePostDto = z.infer<typeof likePostSchema.params>;
export type updatedPostBodyDto = z.infer<typeof updatedPostSchema.body>;
export type updatedPostParamsDto = z.infer<typeof updatedPostSchema.params>;
export type GetPostsQueryDto = z.infer<typeof getPostsSchema.query>;
export type FreezePostDto = z.infer<typeof freezePostSchema.params>;
export type ReStorePostDto = z.infer<typeof reStorePostSchema.params>;
export type DeletePostDto = z.infer<typeof deletePostSchema.params>;
export type SharePostDto = z.infer<typeof sharePostSchema.params>;
export type GetPostDto = z.infer<typeof GetPostSchema.params>;
export type SavedPostsDto = z.infer<typeof savedPostsSchema.params>;