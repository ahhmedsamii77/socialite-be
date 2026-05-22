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
exports.commentRouter = void 0;
const express_1 = require("express");
const CV = __importStar(require("./comment.validation"));
const comment_service_1 = __importDefault(require("./comment.service"));
const middleware_1 = require("../../middleware");
const types_1 = require("../../utils/types");
exports.commentRouter = (0, express_1.Router)({
    mergeParams: true,
});
exports.commentRouter.post("/", (0, middleware_1.authentication)(), (0, middleware_1.multerCloud)({
    validation: [...middleware_1.fileValidation.image, ...middleware_1.fileValidation.video],
}).array("attachments", 2), (0, middleware_1.validation)(CV.createCommentSchema), comment_service_1.default.createComment);
exports.commentRouter.post("/:commentId/reply", (0, middleware_1.authentication)(), (0, middleware_1.multerCloud)({}).array("attachments", 2), (0, middleware_1.validation)(CV.createReplySchema), comment_service_1.default.createReply);
exports.commentRouter.patch("/:commentId/like", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.likeCommentSchema), comment_service_1.default.likeComment);
exports.commentRouter.patch("/:commentId", (0, middleware_1.authentication)(), (0, middleware_1.multerCloud)({ validation: [...middleware_1.fileValidation.image, ...middleware_1.fileValidation.video] }).array("attachments", 2), (0, middleware_1.validation)(CV.updateCommentSchema), comment_service_1.default.updateComment);
exports.commentRouter.get("/", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.getCommentsSchema), comment_service_1.default.getComments);
exports.commentRouter.get("/:commentId/reply", (0, middleware_1.authentication)(), comment_service_1.default.getReplies);
exports.commentRouter.delete("/:commentId/freeze", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.freezeCommentSchema), comment_service_1.default.freezeComment);
exports.commentRouter.patch("/:commentId/restore", (0, middleware_1.authentication)(), (0, middleware_1.validation)(CV.reStoreCommentSchema), comment_service_1.default.restoreComment);
exports.commentRouter.delete("/:commentId", (0, middleware_1.authentication)(), (0, middleware_1.authorization)([types_1.RoleEnum.ADMIN, types_1.RoleEnum.SUPER_ADMIN]), (0, middleware_1.validation)(CV.deleteCommentSchema), comment_service_1.default.deleteComment);
