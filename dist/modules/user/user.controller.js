"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const user_service_1 = __importDefault(require("./user.service"));
const middleware_1 = require("../../middleware");
const middleware_2 = require("../../middleware");
const UV = __importStar(require("./user.validation"));
const types_1 = require("../../utils/types/types");
const chat_controller_1 = require("../chat/chat.controller");
exports.userRouter = (0, express_1.Router)({
    mergeParams: true,
});
exports.userRouter.use("/:userId/chat", chat_controller_1.chatRouter);
exports.userRouter.get("/profile", (0, middleware_2.authentication)(), user_service_1.default.getProfile);
exports.userRouter.get("/suggestions", (0, middleware_2.authentication)(), user_service_1.default.getSuggestions);
exports.userRouter.get("/dashboard", (0, middleware_2.authentication)(), (0, middleware_1.authorization)([types_1.RoleEnum.ADMIN, types_1.RoleEnum.SUPER_ADMIN]), user_service_1.default.getDashboard);
exports.userRouter.patch("/:userId/change-role", (0, middleware_2.authentication)(), (0, middleware_1.authorization)([types_1.RoleEnum.SUPER_ADMIN, types_1.RoleEnum.ADMIN]), (0, middleware_1.validation)(UV.changeRoleSchema), user_service_1.default.changeRole);
exports.userRouter.post("/logout", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.logoutSchema), user_service_1.default.logOut);
exports.userRouter.get("/refresh-token", (0, middleware_2.authentication)(types_1.TokenTypeEnum.REFRESH_TOKEN), user_service_1.default.refreshToken);
exports.userRouter.patch("/update-password", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.updatePasswordSchema), user_service_1.default.updatePassword);
exports.userRouter.patch("/", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.updateProfileSchema), user_service_1.default.updateProfile);
exports.userRouter.get("/suggestions", (0, middleware_2.authentication)(), user_service_1.default.getSuggestions);
exports.userRouter.get("/friends", (0, middleware_2.authentication)(), user_service_1.default.getFriends);
exports.userRouter.get("/:userId", (0, middleware_1.validation)(UV.shareProfileSchema), user_service_1.default.shareProfile);
exports.userRouter.delete("{/:userId}/freeze", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.freezeAccountSchema), user_service_1.default.freezeAccount);
exports.userRouter.patch("/:userId/restore", (0, middleware_2.authentication)(), (0, middleware_1.authorization)([types_1.RoleEnum.ADMIN, types_1.RoleEnum.SUPER_ADMIN]), (0, middleware_1.validation)(UV.reStoreAccountSchema), user_service_1.default.reStoreAccount);
exports.userRouter.get("/", (0, middleware_2.authentication)(), user_service_1.default.getAllUser);
exports.userRouter.delete("/profile-image", (0, middleware_2.authentication)(), user_service_1.default.deleteProfileImage);
exports.userRouter.delete("/cover-images", (0, middleware_2.authentication)(), user_service_1.default.deleteCoverImages);
exports.userRouter.delete("/:userId", (0, middleware_2.authentication)(), (0, middleware_1.authorization)([types_1.RoleEnum.ADMIN, types_1.RoleEnum.SUPER_ADMIN]), (0, middleware_1.validation)(UV.hardDeleteAccountSchema), user_service_1.default.DeleteAccount);
exports.userRouter.patch("/profile-image", (0, middleware_2.authentication)(), (0, middleware_1.multerCloud)({ validation: middleware_1.fileValidation.image }).single("profileImage"), user_service_1.default.uploadProfileImage);
exports.userRouter.patch("/cover-images", (0, middleware_2.authentication)(), (0, middleware_1.multerCloud)({ validation: middleware_1.fileValidation.image }).array("attachments", 1), user_service_1.default.uploadCoverImages);
exports.userRouter.get("/friend-requests/incoming", (0, middleware_2.authentication)(), user_service_1.default.getIncomingRequests);
exports.userRouter.get("/friend-requests/outgoing", (0, middleware_2.authentication)(), user_service_1.default.getOutgoingRequests);
exports.userRouter.post("/:userId/send-friend-request", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.sendRequestSchema), user_service_1.default.sendRequest);
exports.userRouter.patch("/accept-friend-request/:requestId", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.acceptRequestSchema), user_service_1.default.acceptRequest);
exports.userRouter.patch("/reject-friend-request/:requestId", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.rejectRequestSchema), user_service_1.default.rejectRequest);
exports.userRouter.delete("/:friendId/remove-friend", (0, middleware_2.authentication)(), (0, middleware_1.validation)(UV.removeFriendSchema), user_service_1.default.removeFriend);
exports.userRouter.get("/:userId/check-friendship", (0, middleware_2.authentication)(), user_service_1.default.checkFriendShipStatus);
exports.userRouter.delete("/cancel-request/:requestId", (0, middleware_2.authentication)(), user_service_1.default.cancelRequest);
