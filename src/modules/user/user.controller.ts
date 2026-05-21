import { Router } from "express";
import US from "./user.service";
import {
  authorization,
  fileValidation,
  multerCloud,
  validation,
} from "../../middleware";
import { authentication } from "../../middleware";
import * as UV from "./user.validation";
import { RoleEnum, TokenTypeEnum } from "../../utils/types/types";
import { chatRouter } from "../chat/chat.controller";
export const userRouter = Router({
  mergeParams: true,
});

// chat router
userRouter.use("/:userId/chat", chatRouter);

// get user profile
userRouter.get("/profile", authentication(), US.getProfile);

// get suggestions
userRouter.get("/suggestions", authentication(), US.getSuggestions);

// dashboard
userRouter.get(
  "/dashboard",
  authentication(),
  authorization([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
  US.getDashboard,
);

// change role
userRouter.patch(
  "/:userId/change-role",
  authentication(),
  authorization([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]),
  validation(UV.changeRoleSchema),
  US.changeRole,
);

// logout
userRouter.post(
  "/logout",
  authentication(),
  validation(UV.logoutSchema),
  US.logOut,
);

// refresh token
userRouter.get(
  "/refresh-token",
  authentication(TokenTypeEnum.REFRESH_TOKEN),
  US.refreshToken,
);

// update password
userRouter.patch(
  "/update-password",
  authentication(),
  validation(UV.updatePasswordSchema),
  US.updatePassword,
);

// update profile
userRouter.patch(
  "/",
  authentication(),
  validation(UV.updateProfileSchema),
  US.updateProfile,
);

// get suggestions
userRouter.get("/suggestions", authentication(), US.getSuggestions);

// get friends list
userRouter.get("/friends", authentication(), US.getFriends);

// share profile
userRouter.get("/:userId", validation(UV.shareProfileSchema), US.shareProfile);

// freeze account
userRouter.delete(
  "{/:userId}/freeze",
  authentication(),
  validation(UV.freezeAccountSchema),
  US.freezeAccount,
);

// reStore account
userRouter.patch(
  "/:userId/restore",
  authentication(),
  authorization([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
  validation(UV.reStoreAccountSchema),
  US.reStoreAccount,
);

// get users
userRouter.get("/", authentication(), US.getAllUser);

// delete profile image
userRouter.delete(
  "/profile-image",
  authentication(),
  US.deleteProfileImage,
);

// delete cover images
userRouter.delete(
  "/cover-images",
  authentication(),
  US.deleteCoverImages,
);

// hard delete account
userRouter.delete(
  "/:userId",
  authentication(),
  authorization([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
  validation(UV.hardDeleteAccountSchema),
  US.DeleteAccount,
);

// profile image
userRouter.patch(
  "/profile-image",
  authentication(),
  multerCloud({ validation: fileValidation.image }).single("profileImage"),
  US.uploadProfileImage,
);

// upload cover images
userRouter.patch(
  "/cover-images",
  authentication(),
  multerCloud({ validation: fileValidation.image }).array("attachments", 1),
  US.uploadCoverImages,
);


userRouter.get(
  "/friend-requests/incoming",
  authentication(),
  US.getIncomingRequests,
);

userRouter.get(
  "/friend-requests/outgoing",
  authentication(),
  US.getOutgoingRequests,
);

userRouter.post(
  "/:userId/send-friend-request",
  authentication(),
  validation(UV.sendRequestSchema),
  US.sendRequest,
);

// accept request
userRouter.patch(
  "/accept-friend-request/:requestId",
  authentication(),
  validation(UV.acceptRequestSchema),
  US.acceptRequest,
);

// reject request
userRouter.patch(
  "/reject-friend-request/:requestId",
  authentication(),
  validation(UV.rejectRequestSchema),
  US.rejectRequest,
);

// remove friend
userRouter.delete(
  "/:friendId/remove-friend",
  authentication(),
  validation(UV.removeFriendSchema),
  US.removeFriend,
);

// check friendship
userRouter.get(
  "/:userId/check-friendship",
  authentication(),
  US.checkFriendShipStatus,
);

// cancel request
userRouter.delete(
  "/cancel-request/:requestId",
  authentication(),
  US.cancelRequest
);
