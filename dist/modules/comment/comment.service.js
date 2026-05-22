"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const res_1 = require("../../utils/res");
const repositories_1 = require("../../DB/repositories");
const comment_model_1 = require("../../DB/models/comment.model");
const user_model_1 = require("../../DB/models/user.model");
const post_model_1 = require("../../DB/models/post.model");
const post_service_1 = require("../post/post.service");
const s3_config_1 = require("../../utils/aws/s3.config");
const mongoose_1 = require("mongoose");
const gateway_1 = require("../gateway");
const notification_service_1 = require("../notification/notification.service");
class CommentService {
    _commnetModel = new repositories_1.CommentRepository(comment_model_1.commentModel);
    _postModel = new repositories_1.PostRepository(post_model_1.postModel);
    _userModel = new repositories_1.UserRepository(user_model_1.userModel);
    constructor() { }
    createComment = async (req, res) => {
        const { postId } = req.params;
        const { content, attachments, tags } = req.body;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: (0, post_service_1.getPostAvailability)(req),
            allowComments: types_1.AllowCommentsEnum.ALLOW,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        if (tags?.length &&
            (await this._userModel.find({
                _id: { $in: tags, $ne: req?.user?._id },
            })).length !== tags?.length) {
            throw new res_1.NotFoundException("some of mentioned users does not exist.");
        }
        let attachmentsKeys;
        if (attachments?.length) {
            attachmentsKeys = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `user/${post.createdBy}/post/${post?.assetsFolderId}`,
            });
        }
        const comment = await this._commnetModel.create({
            content: content,
            attachments: attachmentsKeys,
            tags: tags,
            createdBy: req?.user?._id,
            postId: postId,
        });
        if (!comment) {
            await (0, s3_config_1.deleteFiles)({
                keys: attachmentsKeys,
            });
            throw new res_1.BadRequestException("Fail to create comment.");
        }
        let recipients = [];
        const userId = req?.user?._id.toString();
        await comment.populate([
            {
                path: "createdBy",
            },
            {
                path: "tags",
            },
        ]);
        if (post.availability === types_1.AvailabilityEnum.FRIENDS) {
            recipients = [
                ...(req?.user?.friends?.map((id) => id.toString()) || []),
                userId,
            ];
            gateway_1.io.to(recipients).emit("new_comment", comment);
        }
        else if (post.availability === types_1.AvailabilityEnum.ONLY_ME) {
            recipients = [userId];
            gateway_1.io.to(recipients).emit("new_comment", comment);
        }
        else {
            gateway_1.io.emit("new_comment", comment);
        }
        if (tags?.length) {
            const tagIds = tags.map((tag) => tag.toString());
            gateway_1.io.to(tagIds).emit("tagged_comment", comment);
        }
        await (0, notification_service_1.createNotification)({
            recipient: post.createdBy,
            sender: req.user._id,
            type: notification_service_1.NotificationTypeEnum.POST_COMMENT,
            message: `${req.user?.username ?? "Someone"} commented on your post.`,
            refId: post._id,
            refModel: "Post",
        });
        return (0, res_1.successResponse)({ res, statusCode: 201 });
    };
    createReply = async (req, res) => {
        const { postId, commentId } = req.params;
        const { content, attachments, tags } = req.body;
        const comment = await this._commnetModel.findOne({
            _id: commentId,
            postId,
        }, undefined, {
            populate: {
                path: "postId",
                match: {
                    $or: (0, post_service_1.getPostAvailability)(req),
                    allowComments: types_1.AllowCommentsEnum.ALLOW,
                    deletedAt: { $exists: false },
                    _id: postId,
                },
            },
        });
        if (!comment?.postId)
            throw new res_1.NotFoundException("Fail to find matched comment.");
        const post = comment.postId;
        if (tags?.length &&
            (await this._userModel.find({
                _id: { $in: tags, $ne: req?.user?._id },
            })).length !== tags?.length) {
            throw new res_1.NotFoundException("some of mentioned users does not exist.");
        }
        let attachmentsKeys;
        if (attachments?.length) {
            attachmentsKeys = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `user/${post.createdBy}/post/${post?.assetsFolderId}`,
            });
        }
        const reply = await this._commnetModel.create({
            content: content,
            attachments: attachmentsKeys,
            tags: tags,
            createdBy: req?.user?._id,
            postId: postId,
            commentId: commentId,
        });
        if (!reply) {
            await (0, s3_config_1.deleteFiles)({
                keys: attachmentsKeys,
            });
            throw new res_1.BadRequestException("Fail to create comment.");
        }
        let recipients = [];
        const userId = req?.user?._id.toString();
        await reply.populate([
            {
                path: "createdBy",
            },
            {
                path: "tags",
            },
        ]);
        if (post.availability === types_1.AvailabilityEnum.FRIENDS) {
            recipients = [
                ...(req?.user?.friends?.map((id) => id.toString()) || []),
                userId,
            ];
            gateway_1.io.to(recipients).emit("new_reply", reply);
        }
        else if (post.availability === types_1.AvailabilityEnum.ONLY_ME) {
            recipients = [userId];
            gateway_1.io.to(recipients).emit("new_reply", reply);
        }
        else {
            gateway_1.io.emit("new_reply", reply);
        }
        if (tags?.length) {
            const tagIds = tags.map((tag) => tag.toString());
            gateway_1.io.to(tagIds).emit("tagged_comment", reply);
        }
        await (0, notification_service_1.createNotification)({
            recipient: comment.createdBy,
            sender: req.user._id,
            type: notification_service_1.NotificationTypeEnum.COMMENT_REPLY,
            message: `${req.user?.username ?? "Someone"} replied to your comment.`,
            refId: comment._id,
            refModel: "Comment",
        });
        return (0, res_1.successResponse)({ res, statusCode: 201 });
    };
    likeComment = async (req, res) => {
        const { commentId, postId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: (0, post_service_1.getPostAvailability)(req),
            allowComments: types_1.AllowCommentsEnum.ALLOW,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        const comment = await this._commnetModel.findOne({
            _id: commentId,
        });
        if (!comment)
            throw new res_1.NotFoundException("Fail to find matched comment.");
        const isLiked = comment?.likes?.includes(req?.user?._id);
        const updateQuery = isLiked
            ? { $pull: { likes: req?.user?._id } }
            : {
                $addToSet: { likes: req?.user?._id },
            };
        const updatedComment = await this._commnetModel.findOneAndUpdate({ _id: commentId }, updateQuery);
        if (!updatedComment)
            throw new res_1.BadRequestException("Fail to update comment.");
        let recipients = [];
        const userId = req?.user?._id.toString();
        const parentCommentId = comment.commentId?.toString() ?? null;
        if (post.availability === types_1.AvailabilityEnum.FRIENDS) {
            recipients = [
                ...(req?.user?.friends?.map((id) => id.toString()) || []),
                userId,
            ];
            gateway_1.io.to(recipients).emit("like_comment", {
                postId: post?._id,
                userId,
                action: isLiked ? "unlike" : "like",
                commentId,
                parentCommentId,
            });
        }
        else if (post.availability === types_1.AvailabilityEnum.ONLY_ME) {
            recipients = [userId];
            gateway_1.io.to(recipients).emit("like_comment", {
                postId: post?._id,
                userId,
                commentId,
                action: isLiked ? "unlike" : "like",
                parentCommentId,
            });
        }
        else {
            gateway_1.io.emit("like_comment", {
                postId: post?._id,
                userId,
                action: isLiked ? "unlike" : "like",
                commentId,
                parentCommentId,
            });
        }
        if (!isLiked) {
            await (0, notification_service_1.createNotification)({
                recipient: comment.createdBy,
                sender: req.user._id,
                type: notification_service_1.NotificationTypeEnum.COMMENT_LIKE,
                message: `${req.user?.username ?? "Someone"} liked your comment.`,
                refId: comment._id,
                refModel: "Comment",
            });
        }
        return (0, res_1.successResponse)({ res });
    };
    updateComment = async (req, res) => {
        const { content, attachments, tags, removedAttachments, removedTags, } = req.body;
        const { commentId, postId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: (0, post_service_1.getPostAvailability)(req),
            allowComments: types_1.AllowCommentsEnum.ALLOW,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        const comment = await this._commnetModel.findOne({
            _id: commentId,
            createdBy: req?.user?._id,
        });
        if (!comment)
            throw new res_1.NotFoundException("Fail to find matched comment.");
        if (tags?.length &&
            (await this._userModel.find({
                _id: { $in: tags, $ne: req?.user?._id },
            })).length !== tags?.length) {
            throw new res_1.NotFoundException("some of mentioned users does not exist.");
        }
        let attachmentsKeys;
        if (attachments?.length) {
            attachmentsKeys = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `user/${post.createdBy}/post/${post?.assetsFolderId}`,
            });
        }
        const updatedComment = await this._commnetModel.findOneAndUpdate({
            _id: commentId,
            createdBy: req?.user?._id,
        }, [
            {
                $set: {
                    content: content,
                    attachments: {
                        $setUnion: [
                            {
                                $setDifference: ["$attachments", removedAttachments || []],
                            },
                            attachmentsKeys || [],
                        ],
                    },
                    tags: {
                        $setUnion: [
                            {
                                $setDifference: [
                                    "$tags",
                                    removedTags?.map((tag) => {
                                        return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                    }) || [],
                                ],
                            },
                            tags?.map((tag) => mongoose_1.Types.ObjectId.createFromHexString(tag)) ||
                                [],
                        ],
                    },
                },
            },
        ], { new: true });
        if (!updatedComment) {
            await (0, s3_config_1.deleteFiles)({
                keys: attachmentsKeys,
            });
            throw new res_1.BadRequestException("Fail to update comment.");
        }
        if (removedAttachments?.length)
            await (0, s3_config_1.deleteFiles)({ keys: removedAttachments });
        let recipients = [];
        const userId = req?.user?._id.toString();
        const parentCommentId = comment.commentId?.toString() ?? null;
        await updatedComment.populate([
            {
                path: "createdBy",
            },
            {
                path: "tags",
            },
        ]);
        if (post.availability === types_1.AvailabilityEnum.FRIENDS) {
            recipients = [
                ...(req?.user?.friends?.map((id) => id.toString()) || []),
                userId,
            ];
            gateway_1.io.to(recipients).emit("update_comment", {
                updatedComment,
                parentCommentId,
            });
        }
        else if (post.availability === types_1.AvailabilityEnum.ONLY_ME) {
            recipients = [userId];
            gateway_1.io.to(recipients).emit("update_comment", {
                updatedComment,
                parentCommentId,
            });
        }
        else {
            gateway_1.io.emit("update_comment", { updatedComment, parentCommentId });
        }
        return (0, res_1.successResponse)({ res });
    };
    getComments = async (req, res) => {
        const { postId } = req.params;
        const { after, limit = 10, cursor, } = req.query;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: (0, post_service_1.getPostAvailability)(req),
            allowComments: types_1.AllowCommentsEnum.ALLOW,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        const totalCount = (await comment_model_1.commentModel.countDocuments({
            postId: mongoose_1.Types.ObjectId.createFromHexString(postId),
            deletedAt: { $exists: false },
        }));
        const filterQuery = {
            postId: mongoose_1.Types.ObjectId.createFromHexString(postId),
            commentId: { $exists: false },
        };
        if (cursor)
            filterQuery.createdAt = { $lt: new Date(cursor) };
        else if (after)
            filterQuery.createdAt = { $gt: new Date(after) };
        let comments = await this._commnetModel.find(filterQuery, undefined, {
            sort: { createdAt: -1 },
            populate: [
                {
                    path: "createdBy",
                },
                {
                    path: "tags",
                },
            ],
        });
        return (0, res_1.successResponse)({
            res,
            data: {
                nextCursor: comments.length
                    ? comments[comments.length - 1]?.createdAt
                    : "",
                count: totalCount,
                comments: comments.slice(0, parseInt(limit)),
            },
        });
    };
    getReplies = async (req, res) => {
        const { postId, commentId } = req.params;
        const { cursor, limit = 10 } = req.query;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: (0, post_service_1.getPostAvailability)(req),
            allowComments: types_1.AllowCommentsEnum.ALLOW,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        const filterQuery = {
            postId: mongoose_1.Types.ObjectId.createFromHexString(postId),
            commentId: mongoose_1.Types.ObjectId.createFromHexString(commentId),
        };
        if (cursor)
            filterQuery.createdAt = { $gt: new Date(cursor) };
        let replies = await this._commnetModel.find(filterQuery, undefined, {
            sort: { createdAt: -1 },
            populate: [{ path: "createdBy" }, { path: "tags" }],
        });
        const count = replies.length;
        return (0, res_1.successResponse)({
            res,
            data: {
                replies: replies.slice(0, parseInt(limit)),
                count,
                nextCursor: replies.length
                    ? replies[replies.length - 1]?.createdAt
                    : "",
            },
        });
    };
    freezeComment = async (req, res) => {
        const { postId, commentId } = req.params;
        const post = await this._postModel.findOne({ _id: postId });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        const comment = await this._commnetModel.findOne({
            _id: commentId,
            paranoid: false,
            deletedAt: { $exists: false },
        });
        if (!comment)
            throw new res_1.NotFoundException("Fail to find matched comment.");
        const isAdmin = req?.user?.role === types_1.RoleEnum.ADMIN;
        const isPostOwner = req?.user?._id?.toString() === post?.createdBy?.toString();
        const isCommentOwner = req?.user?._id?.toString() === comment?.createdBy?.toString();
        if (!isAdmin && !isPostOwner && !isCommentOwner)
            throw new res_1.ForbiddenException("You are not allowed to freeze this comment.");
        const repliesCount = await comment_model_1.commentModel.countDocuments({
            commentId,
            postId,
            deletedAt: { $exists: false },
        });
        const updatedComment = await this._commnetModel.updateOne({ _id: commentId }, {
            deletedAt: new Date(),
            deletedBy: req?.user?._id,
            $unset: { reStoredAt: "", reStoredBy: "" },
        });
        if (!updatedComment.matchedCount)
            throw new res_1.BadRequestException("Fail to freeze comment.");
        const userId = req?.user?._id.toString();
        const parentCommentId = comment.commentId?.toString() ?? null;
        const getFriendsWithMe = () => [
            ...(req?.user?.friends?.map((id) => id.toString()) || []),
            userId,
        ];
        const payload = {
            commentId: comment._id,
            parentCommentId,
            postId: post._id,
            repliesCount,
        };
        if (post.availability === types_1.AvailabilityEnum.PUBLIC) {
            gateway_1.io.emit("remove_comment", payload);
        }
        else if (post.availability === types_1.AvailabilityEnum.FRIENDS) {
            gateway_1.io.to(getFriendsWithMe()).emit("remove_comment", payload);
        }
        else {
            gateway_1.io.to(userId).emit("remove_comment", payload);
        }
        return (0, res_1.successResponse)({ res });
    };
    restoreComment = async (req, res) => {
        const { postId, commentId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        const comment = await this._commnetModel.findOne({
            _id: commentId,
            paranoid: false,
            deletedAt: { $exists: true },
        });
        if (!comment)
            throw new res_1.NotFoundException("Fail to find matched comment.");
        const isAdmin = req?.user?.role === types_1.RoleEnum.ADMIN;
        const iscommentOwner = req?.user?._id?.toString() === comment?.createdBy?.toString();
        if (!isAdmin && !iscommentOwner)
            throw new res_1.ForbiddenException("You are not allowed to restore this comment.");
        const updateComment = await this._commnetModel.updateOne({
            _id: commentId,
        }, {
            reStoredAt: new Date(),
            reStoredBy: req?.user?._id,
            $unset: { deletedAt: "", deletedBy: "" },
        });
        if (!updateComment.matchedCount)
            throw new res_1.NotFoundException("Fail to restore comment.");
        return (0, res_1.successResponse)({ res });
    };
    deleteComment = async (req, res) => {
        const { postId, commentId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        const comment = await this._commnetModel.findOneAndDelete({
            _id: commentId,
            paranoid: false,
            deletedAt: { $exists: true },
        });
        if (!comment)
            throw new res_1.NotFoundException("Fail to find matched comment.");
        if (comment?.attachments?.length) {
            await (0, s3_config_1.deleteFiles)({
                keys: comment?.attachments,
            });
        }
        return (0, res_1.successResponse)({ res });
    };
}
exports.default = new CommentService();
