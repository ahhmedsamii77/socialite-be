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
exports.postRouter = void 0;
const express_1 = require("express");
const PV = __importStar(require("./post.validation"));
const post_service_1 = __importDefault(require("./post.service"));
const middleware_1 = require("../../middleware");
const types_1 = require("../../utils/types");
const comment_controller_1 = require("../comment/comment.controller");
exports.postRouter = (0, express_1.Router)();
exports.postRouter.use("/:postId/comment", comment_controller_1.commentRouter);
exports.postRouter.post("/", (0, middleware_1.authentication)(), (0, middleware_1.multerCloud)({
    validation: [...middleware_1.fileValidation.image, ...middleware_1.fileValidation.video],
}).array("attachments", 2), (0, middleware_1.validation)(PV.createPostSchema), post_service_1.default.createPost);
exports.postRouter.patch("/:postId/like", (0, middleware_1.authentication)(), (0, middleware_1.validation)(PV.likePostSchema), post_service_1.default.likePost);
exports.postRouter.patch("/:postId/save", (0, middleware_1.authentication)(), (0, middleware_1.validation)(PV.savedPostsSchema), post_service_1.default.savePost);
exports.postRouter.patch("/:postId", (0, middleware_1.authentication)(), (0, middleware_1.multerCloud)({ validation: [...middleware_1.fileValidation.image, ...middleware_1.fileValidation.video] }).array("attachments", 2), (0, middleware_1.validation)(PV.updatedPostSchema), post_service_1.default.updatePost);
exports.postRouter.get("/", (0, middleware_1.authentication)(), (0, middleware_1.validation)(PV.getPostsSchema), post_service_1.default.getPosts);
exports.postRouter.delete("/:postId/freeze", (0, middleware_1.authentication)(), (0, middleware_1.validation)(PV.freezePostSchema), post_service_1.default.freezePost);
exports.postRouter.patch("/:postId/restore", (0, middleware_1.authentication)(), (0, middleware_1.validation)(PV.reStorePostSchema), post_service_1.default.restorePost);
exports.postRouter.delete("/:postId", (0, middleware_1.authentication)(), (0, middleware_1.authorization)([types_1.RoleEnum.ADMIN, types_1.RoleEnum.SUPER_ADMIN]), (0, middleware_1.validation)(PV.deletePostSchema), post_service_1.default.deletePost);
exports.postRouter.get("/:postId/share", (0, middleware_1.validation)(PV.sharePostSchema), post_service_1.default.sharePost);
exports.postRouter.get("/:postId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(PV.GetPostSchema), post_service_1.default.getPost);
