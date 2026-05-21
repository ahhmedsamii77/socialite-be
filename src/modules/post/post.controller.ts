import { Router } from "express";
import * as PV from "./post.validation";
import PS from "./post.service";
import {
  authentication,
  authorization,
  fileValidation,
  multerCloud,
  validation,
} from "../../middleware";
import { RoleEnum } from "../../utils/types";
import { commentRouter } from "../comment/comment.controller";

export const postRouter = Router();

// comment route
postRouter.use("/:postId/comment", commentRouter);

// create post
postRouter.post(
  "/",
  authentication(),
  multerCloud({
    validation: [...fileValidation.image, ...fileValidation.video],
  }).array("attachments", 2),
  validation(PV.createPostSchema),
  PS.createPost,
);

// like post
postRouter.patch(
  "/:postId/like",
  authentication(),
  validation(PV.likePostSchema),
  PS.likePost,
);

// savePost
postRouter.patch(
  "/:postId/save",
  authentication(),
  validation(PV.savedPostsSchema),
  PS.savePost,
);

// update post
postRouter.patch(
  "/:postId",
  authentication(),
  multerCloud({validation: [...fileValidation.image, ...fileValidation.video]}).array("attachments", 2),
  validation(PV.updatedPostSchema),
  PS.updatePost,
);

// get posts
postRouter.get(
  "/",
  authentication(),
  validation(PV.getPostsSchema),
  PS.getPosts,
);

// freeze post
postRouter.delete(
  "/:postId/freeze",
  authentication(),
  validation(PV.freezePostSchema),
  PS.freezePost,
);

// restore post
postRouter.patch(
  "/:postId/restore",
  authentication(),
  validation(PV.reStorePostSchema),
  PS.restorePost,
);

// delete post
postRouter.delete(
  "/:postId",
  authentication(),
  authorization([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
  validation(PV.deletePostSchema),
  PS.deletePost,
);

// share post
postRouter.get("/:postId/share", validation(PV.sharePostSchema), PS.sharePost);

// get post
postRouter.get(
  "/:postId",
  authentication(),
  validation(PV.GetPostSchema),
  PS.getPost,
);
