import { Router } from "express";
import * as CV from "./comment.validation";
import CS from "./comment.service";
import {
  authentication,
  authorization,
  fileValidation,
  multerCloud,
  validation,
} from "../../middleware";
import { RoleEnum } from "../../utils/types";

export const commentRouter = Router({
  mergeParams: true,
});

// create comment
commentRouter.post(
  "/",
  authentication(),
  multerCloud({
    validation: [...fileValidation.image, ...fileValidation.video],
  }).array("attachments", 2),
  validation(CV.createCommentSchema),
  CS.createComment,
);

// create reply
commentRouter.post(
  "/:commentId/reply",
  authentication(),
  multerCloud({}).array("attachments", 2),
  validation(CV.createReplySchema),
  CS.createReply,
);

// like comment
commentRouter.patch(
  "/:commentId/like",
  authentication(),
  validation(CV.likeCommentSchema),
  CS.likeComment,
);

// update comment
commentRouter.patch(
  "/:commentId",
  authentication(),
  multerCloud({validation: [...fileValidation.image, ...fileValidation.video]}).array("attachments", 2),
  validation(CV.updateCommentSchema),
  CS.updateComment,
);

// get comments
commentRouter.get(
  "/",
  authentication(),
  validation(CV.getCommentsSchema),
  CS.getComments,
);

// get replies for a specific comment
commentRouter.get(
  "/:commentId/reply",
  authentication(),
  CS.getReplies,
);

// freeze comment
commentRouter.delete(
  "/:commentId/freeze",
  authentication(),
  validation(CV.freezeCommentSchema),
  CS.freezeComment,
);

// restore comment
commentRouter.patch(
  "/:commentId/restore",
  authentication(),
  validation(CV.reStoreCommentSchema),
  CS.restoreComment,
);

// delete comment
commentRouter.delete(
  "/:commentId",
  authentication(),
  authorization([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
  validation(CV.deleteCommentSchema),
  CS.deleteComment,
);
