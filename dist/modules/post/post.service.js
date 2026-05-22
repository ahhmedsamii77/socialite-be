"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostAvailability = getPostAvailability;
const s3_config_1 = require("../../utils/aws/s3.config");
const uuid_1 = require("uuid");
const res_1 = require("../../utils/res");
const repositories_1 = require("../../DB/repositories");
const user_model_1 = require("../../DB/models/user.model");
const post_model_1 = require("../../DB/models/post.model");
const mongoose_1 = require("mongoose");
const types_1 = require("../../utils/types");
const gateway_1 = require("../gateway");
const notification_service_1 = require("../notification/notification.service");
function getPostAvailability(req) {
    return [
        { availability: types_1.AvailabilityEnum.PUBLIC },
        {
            availability: types_1.AvailabilityEnum.ONLY_ME,
            createdBy: req?.user?._id,
        },
        {
            availability: types_1.AvailabilityEnum.FRIENDS,
            createdBy: {
                $in: [
                    req?.user?._id,
                    ...(req?.user?.friends || []),
                ],
            },
        },
        {
            availability: {
                $in: [types_1.AvailabilityEnum.PUBLIC, types_1.AvailabilityEnum.FRIENDS],
            },
            tags: req?.user?._id,
        },
    ];
}
class PostService {
    _userModel = new repositories_1.UserRepository(user_model_1.userModel);
    _postModel = new repositories_1.PostRepository(post_model_1.postModel);
    constructor() { }
    createPost = async (req, res) => {
        let { content, attachments, tags, allowComments, availability, } = req.body;
        const assetsFolderId = (0, uuid_1.v4)();
        let attachmentsKeys;
        if (attachments?.length) {
            attachmentsKeys = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `user/${req?.user?.id}/post/${assetsFolderId}`,
            });
        }
        if (tags?.length &&
            (await this._userModel.find({ _id: { $in: tags, $ne: req?.user?._id } }))
                .length !== tags?.length) {
            throw new res_1.NotFoundException("some of mentioned users does not exist.");
        }
        const post = await this._postModel.create({
            content: content,
            assetsFolderId: assetsFolderId,
            attachments: attachmentsKeys,
            tags: tags,
            allowComments: allowComments,
            availability: availability,
            createdBy: req?.user?._id,
        });
        if (!post) {
            await (0, s3_config_1.deleteFiles)({
                keys: attachmentsKeys,
            });
            throw new res_1.BadRequestException("Failed to create post.");
        }
        let recipients = [];
        const userId = req?.user?._id.toString();
        await post.populate([
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
            gateway_1.io.to(recipients).emit("new_post", post);
        }
        else if (post.availability === types_1.AvailabilityEnum.ONLY_ME) {
            recipients = [userId];
            gateway_1.io.to(recipients).emit("new_post", post);
        }
        else {
            gateway_1.io.emit("new_post", post);
        }
        if (tags?.length) {
            const tagIds = tags.map((tag) => tag.toString());
            gateway_1.io.to(tagIds).emit("tagged_post", post);
            await Promise.allSettled(tags.map((tagId) => (0, notification_service_1.createNotification)({
                recipient: tagId,
                sender: req.user._id,
                type: notification_service_1.NotificationTypeEnum.POST_LIKE,
                message: `${req.user?.username ?? "Someone"} tagged you in a post.`,
                refId: post._id,
                refModel: "Post",
            })));
        }
        return (0, res_1.successResponse)({ res, statusCode: 201 });
    };
    likePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: getPostAvailability(req),
        });
        if (!post)
            throw new res_1.NotFoundException("post not found.");
        const isLiked = post?.likes?.some((id) => id.toString() === req?.user?._id?.toString());
        const updateQuery = isLiked
            ? { $pull: { likes: req?.user?._id } }
            : { $addToSet: { likes: req?.user?._id } };
        const updatedPost = await this._postModel.findOneAndUpdate({ _id: post._id }, updateQuery);
        if (!updatedPost)
            throw new res_1.BadRequestException(`Failed to ${isLiked ? "unlike" : "like"} post.`);
        let recipients = [];
        const userId = req?.user?._id.toString();
        if (post.availability === types_1.AvailabilityEnum.FRIENDS) {
            recipients = [
                ...(req?.user?.friends?.map((id) => id.toString()) || []),
                userId,
            ];
            gateway_1.io.to(recipients).emit("like_post", {
                postId: post?._id,
                userId,
                action: isLiked ? "unlike" : "like",
            });
        }
        else if (post.availability === types_1.AvailabilityEnum.ONLY_ME) {
            recipients = [userId];
            gateway_1.io.to(recipients).emit("like_post", {
                postId: post?._id,
                userId,
                action: isLiked ? "unlike" : "like",
            });
        }
        else {
            gateway_1.io.emit("like_post", {
                postId: post?._id,
                userId,
                action: isLiked ? "unlike" : "like",
            });
        }
        if (!isLiked) {
            await (0, notification_service_1.createNotification)({
                recipient: post.createdBy,
                sender: req.user._id,
                type: notification_service_1.NotificationTypeEnum.POST_LIKE,
                message: `${req.user?.username ?? "Someone"} liked your post.`,
                refId: post._id,
                refModel: "Post",
            });
        }
        return (0, res_1.successResponse)({ res });
    };
    updatePost = async (req, res) => {
        const { postId } = req.params;
        const { content, attachments, tags, allowComments, availability, removedAttachments, removedTags, } = req.body;
        const post = await this._postModel.findOne({
            _id: postId,
            createdBy: req?.user?._id,
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        if (tags?.length &&
            (await this._userModel.find({ _id: { $in: tags, $ne: req?.user?._id } }))
                .length !== tags?.length) {
            throw new res_1.NotFoundException("some of mentioned users does not exist.");
        }
        let attachmentsKeys;
        if (attachments?.length) {
            attachmentsKeys = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `user/${req?.user?.id}/post/${post.assetsFolderId}`,
            });
        }
        const oldAvailability = post.availability;
        const updatedPost = await this._postModel.findOneAndUpdate({ _id: post._id }, [
            {
                $set: {
                    content: content || post.content,
                    allowComments: allowComments || post.allowComments,
                    availability: availability || post.availability,
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
                                    (removedTags || []).map((tag) => mongoose_1.Types.ObjectId.createFromHexString(tag)),
                                ],
                            },
                            (tags || []).map((tag) => mongoose_1.Types.ObjectId.createFromHexString(tag)),
                        ],
                    },
                },
            },
        ], { new: true });
        if (!updatedPost) {
            await (0, s3_config_1.deleteFiles)({ keys: attachmentsKeys });
            throw new res_1.BadRequestException("Failed to update post.");
        }
        if (removedAttachments?.length) {
            await (0, s3_config_1.deleteFiles)({ keys: removedAttachments });
        }
        const newAvailability = updatedPost.availability;
        const userId = req?.user?._id.toString();
        await updatedPost.populate([
            {
                path: "createdBy",
            },
            {
                path: "tags",
            },
        ]);
        const getFriendsWithMe = () => [
            ...(req?.user?.friends?.map((id) => id.toString()) || []),
            userId,
        ];
        if (oldAvailability !== newAvailability) {
            if (oldAvailability === types_1.AvailabilityEnum.PUBLIC) {
                gateway_1.io.emit("remove_post", { postId: updatedPost._id });
            }
            else if (oldAvailability === types_1.AvailabilityEnum.FRIENDS) {
                gateway_1.io.to(getFriendsWithMe()).emit("remove_post", {
                    postId: updatedPost._id,
                });
            }
            else if (oldAvailability === types_1.AvailabilityEnum.ONLY_ME) {
                gateway_1.io.to(userId).emit("remove_post", {
                    postId: updatedPost._id,
                });
            }
            if (newAvailability === types_1.AvailabilityEnum.PUBLIC) {
                gateway_1.io.emit("new_post", updatedPost);
            }
            else if (newAvailability === types_1.AvailabilityEnum.FRIENDS) {
                gateway_1.io.to(getFriendsWithMe()).emit("new_post", updatedPost);
            }
            else if (newAvailability === types_1.AvailabilityEnum.ONLY_ME) {
                gateway_1.io.to(userId).emit("new_post", updatedPost);
            }
        }
        else {
            if (newAvailability === types_1.AvailabilityEnum.PUBLIC) {
                gateway_1.io.emit("updated_post", updatedPost);
            }
            else if (newAvailability === types_1.AvailabilityEnum.FRIENDS) {
                gateway_1.io.to(getFriendsWithMe()).emit("updated_post", updatedPost);
            }
            else {
                gateway_1.io.to(userId).emit("updated_post", updatedPost);
            }
        }
        return (0, res_1.successResponse)({ res });
    };
    getPosts = async (req, res) => {
        const { cursor, limit = 5, after, } = req.query;
        const filter = { $or: getPostAvailability(req) };
        if (after && cursor)
            throw new res_1.BadRequestException("Cannot use after and cursor at the same time.");
        if (after)
            filter.createdAt = { $gt: new Date(after) };
        if (cursor)
            filter.createdAt = { $lt: new Date(cursor) };
        const posts = await this._postModel.find(filter, undefined, {
            sort: { createdAt: -1 },
            limit: parseInt(limit),
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
                nextCursor: posts.length
                    ? posts[posts.length - 1]?.createdAt
                    : "",
                posts,
            },
        });
    };
    freezePost = async (req, res) => {
        const { postId } = req.params;
        const filter = {
            _id: postId,
            deletedAt: { $exists: false },
            paranoid: false,
        };
        if (req?.user?.role === types_1.RoleEnum.USER)
            filter.createdBy = req?.user?._id;
        const post = await this._postModel.findOneAndUpdate(filter, {
            deletedAt: new Date(),
            deletedBy: req?.user?._id,
            $unset: {
                reStoredAt: "",
                reStoredBy: "",
            },
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post or you are not authorized to freeze this post.");
        const userId = req?.user?._id.toString();
        const getFriendsWithMe = () => [
            ...(req?.user?.friends?.map((id) => id.toString()) || []),
            userId,
        ];
        if (post.availability === types_1.AvailabilityEnum.PUBLIC) {
            gateway_1.io.emit("remove_post", { postId: post._id });
        }
        else if (post.availability === types_1.AvailabilityEnum.FRIENDS) {
            gateway_1.io.to(getFriendsWithMe()).emit("remove_post", {
                postId: post._id,
            });
        }
        else if (post.availability === types_1.AvailabilityEnum.ONLY_ME) {
            gateway_1.io.to(userId).emit("remove_post", {
                postId: post._id,
            });
        }
        return (0, res_1.successResponse)({ res });
    };
    restorePost = async (req, res) => {
        const { postId } = req.params;
        const filter = {
            _id: postId,
            deletedAt: { $exists: true },
            paranoid: false,
        };
        if (req?.user?.role === types_1.RoleEnum.USER) {
            filter.deletedBy = req?.user?._id;
            filter.createdBy = req?.user?._id;
        }
        const post = await this._postModel.findOneAndUpdate(filter, {
            reStoredAt: new Date(),
            reStoredBy: req?.user?._id,
            $unset: {
                deletedAt: "",
                deletedBy: "",
            },
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post or you are not authorized to restore this post.");
        return (0, res_1.successResponse)({ res });
    };
    deletePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this._postModel.findOneAndDelete({
            _id: postId,
            paranoid: false,
            deletedAt: { $exists: true },
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        if (post?.attachments?.length) {
            await (0, s3_config_1.deleteFolderByPrefix)({
                path: `user/${post.createdBy}/post/${post.assetsFolderId}`,
            }).catch(() => null);
        }
        return (0, res_1.successResponse)({ res });
    };
    sharePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: getPostAvailability(req),
        }, undefined, {
            populate: [
                {
                    path: "createdBy",
                },
                {
                    path: "tags",
                },
            ],
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        return (0, res_1.successResponse)({
            res,
            data: {
                post,
            },
        });
    };
    getPost = async (req, res) => {
        const { postId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: getPostAvailability(req),
        }, undefined, {
            populate: [
                {
                    path: "createdBy",
                },
                {
                    path: "tags",
                },
            ],
        });
        if (!post)
            throw new res_1.NotFoundException("Fail to find matched post.");
        return (0, res_1.successResponse)({
            res,
            data: {
                post,
            },
        });
    };
    savePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this._postModel.findOne({
            _id: postId,
            $or: getPostAvailability(req),
        });
        if (!post)
            throw new res_1.NotFoundException("post not found.");
        const isSaved = req?.user.savedPosts.some((id) => id.toString() === postId);
        const updateQuery = isSaved
            ? { $pull: { savedPosts: postId } }
            : { $addToSet: { savedPosts: postId } };
        const savedPosts = await this._userModel.findOneAndUpdate({ _id: req?.user?._id }, updateQuery);
        if (!savedPosts)
            throw new res_1.BadRequestException(`Failed to ${isSaved ? "unsave" : "save"} post.`);
        return (0, res_1.successResponse)({ res });
    };
}
exports.default = new PostService();
