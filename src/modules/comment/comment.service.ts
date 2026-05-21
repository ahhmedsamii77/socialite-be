import type { Request, Response } from "express";
import {
  CreateCommentBodyDto,
  CreateCommentParamsDto,
  CreateReplyBodyDto,
  CreateReplyParamsDto,
  DeleteCommentParamsDto,
  FreezeCommentParamsDto,
  GetCommentsParamsDto,
  GetCommentsQueryDto,
  LikeCommentDto,
  ReStoreCommentParamsDto,
  UpdateCommentBodyDto,
  UpdateCommentParamsDto,
} from "./comment.dto";
import {
  AllowCommentsEnum,
  AvailabilityEnum,
  CommentType,
  GetCommentsResponseType,
  RoleEnum,
} from "../../utils/types";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  successResponse,
} from "../../utils/res";
import {
  CommentRepository,
  PostRepository,
  UserRepository,
} from "../../DB/repositories";
import { commentModel, HCommentDocument } from "../../DB/models/comment.model";
import { userModel } from "../../DB/models/user.model";
import { HPostDocument, postModel } from "../../DB/models/post.model";
import { getPostAvailability } from "../post/post.service";
import { deleteFiles, uploadFiles } from "../../utils/aws/s3.config";
import { QueryFilter, Types } from "mongoose";
import { io } from "../gateway";
import {
  createNotification,
  NotificationTypeEnum,
} from "../notification/notification.service";

class CommentService {
  private _commnetModel = new CommentRepository(commentModel);
  private _postModel = new PostRepository(postModel);
  private _userModel = new UserRepository(userModel);

  constructor() {}

  // create comment
  createComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: CreateCommentParamsDto =
      req.params as unknown as CreateCommentParamsDto;
    const { content, attachments, tags }: CreateCommentBodyDto =
      req.body as unknown as CreateCommentBodyDto;
    const post = await this._postModel.findOne({
      _id: postId,
      $or: getPostAvailability(req),
      allowComments: AllowCommentsEnum.ALLOW,
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    if (
      tags?.length &&
      (
        await this._userModel.find({
          _id: { $in: tags, $ne: req?.user?._id! },
        })
      ).length !== tags?.length
    ) {
      throw new NotFoundException("some of mentioned users does not exist.");
    }
    let attachmentsKeys;
    if (attachments?.length) {
      attachmentsKeys = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `user/${post.createdBy}/post/${post?.assetsFolderId}`,
      });
    }
    const comment = await this._commnetModel.create({
      content: content as string,
      attachments: attachmentsKeys as string[],
      tags: tags as unknown as Types.ObjectId[],
      createdBy: req?.user?._id as unknown as Types.ObjectId,
      postId: postId as unknown as Types.ObjectId,
    });
    if (!comment) {
      await deleteFiles({
        keys: attachmentsKeys as string[],
      });
      throw new BadRequestException("Fail to create comment.");
    }
    let recipients: string[] = [];
    const userId = req?.user?._id.toString() as unknown as string;
    await comment.populate([
      {
        path: "createdBy",
      },
      {
        path: "tags",
      },
    ]);
    if (post.availability === AvailabilityEnum.FRIENDS) {
      recipients = [
        ...(req?.user?.friends?.map((id) => id.toString()) || []),
        userId,
      ];
      io.to(recipients).emit("new_comment", comment);
    } else if (post.availability === AvailabilityEnum.ONLY_ME) {
      recipients = [userId];
      io.to(recipients).emit("new_comment", comment);
    } else {
      io.emit("new_comment", comment);
    }
    if (tags?.length) {
      const tagIds = tags.map((tag) => tag.toString());
      io.to(tagIds).emit("tagged_comment", comment);
    }
    // notify post owner
    await createNotification({
      recipient: post.createdBy as unknown as Types.ObjectId,
      sender: req.user!._id as unknown as Types.ObjectId,
      type: NotificationTypeEnum.POST_COMMENT,
      message: `${req.user?.username ?? "Someone"} commented on your post.`,
      refId: post._id as unknown as Types.ObjectId,
      refModel: "Post",
    });
    return successResponse({ res, statusCode: 201 });
  };

  // create reply
  createReply = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId }: CreateReplyParamsDto =
      req.params as unknown as CreateReplyParamsDto;
    const { content, attachments, tags }: CreateReplyBodyDto =
      req.body as unknown as CreateReplyBodyDto;
    const comment = await this._commnetModel.findOne(
      {
        _id: commentId,
        postId,
      },
      undefined,
      {
        populate: {
          path: "postId",
          match: {
            $or: getPostAvailability(req),
            allowComments: AllowCommentsEnum.ALLOW,
            deletedAt: { $exists: false },
            _id: postId,
          },
        },
      },
    );
    if (!comment?.postId)
      throw new NotFoundException("Fail to find matched comment.");
    const post = comment.postId as unknown as HPostDocument;
    if (
      tags?.length &&
      (
        await this._userModel.find({
          _id: { $in: tags, $ne: req?.user?._id! },
        })
      ).length !== tags?.length
    ) {
      throw new NotFoundException("some of mentioned users does not exist.");
    }
    let attachmentsKeys;
    if (attachments?.length) {
      attachmentsKeys = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `user/${post.createdBy}/post/${post?.assetsFolderId}`,
      });
    }
    const reply = await this._commnetModel.create({
      content: content as string,
      attachments: attachmentsKeys as string[],
      tags: tags as unknown as Types.ObjectId[],
      createdBy: req?.user?._id as unknown as Types.ObjectId,
      postId: postId as unknown as Types.ObjectId,
      commentId: commentId as unknown as Types.ObjectId,
    });
    if (!reply) {
      await deleteFiles({
        keys: attachmentsKeys as string[],
      });
      throw new BadRequestException("Fail to create comment.");
    }
    let recipients: string[] = [];
    const userId = req?.user?._id.toString() as unknown as string;
    await reply.populate([
      {
        path: "createdBy",
      },
      {
        path: "tags",
      },
    ]);
    if (post.availability === AvailabilityEnum.FRIENDS) {
      recipients = [
        ...(req?.user?.friends?.map((id) => id.toString()) || []),
        userId,
      ];
      io.to(recipients).emit("new_reply", reply);
    } else if (post.availability === AvailabilityEnum.ONLY_ME) {
      recipients = [userId];
      io.to(recipients).emit("new_reply", reply);
    } else {
      io.emit("new_reply", reply);
    }
    if (tags?.length) {
      const tagIds = tags.map((tag) => tag.toString());
      io.to(tagIds).emit("tagged_comment", reply);
    }
    // notify parent comment author
    await createNotification({
      recipient: comment.createdBy as unknown as Types.ObjectId,
      sender: req.user!._id as unknown as Types.ObjectId,
      type: NotificationTypeEnum.COMMENT_REPLY,
      message: `${req.user?.username ?? "Someone"} replied to your comment.`,
      refId: comment._id as unknown as Types.ObjectId,
      refModel: "Comment",
    });
    return successResponse({ res, statusCode: 201 });
  };

  // like and dislike comment
  likeComment = async (req: Request, res: Response): Promise<Response> => {
    const { commentId, postId }: LikeCommentDto =
      req.params as unknown as LikeCommentDto;
    const post = await this._postModel.findOne({
      _id: postId,
      $or: getPostAvailability(req),
      allowComments: AllowCommentsEnum.ALLOW,
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    const comment = await this._commnetModel.findOne({
      _id: commentId,
    });
    if (!comment) throw new NotFoundException("Fail to find matched comment.");
    const isLiked = comment?.likes?.includes(
      req?.user?._id as unknown as Types.ObjectId,
    );
    const updateQuery = isLiked
      ? { $pull: { likes: req?.user?._id } }
      : {
          $addToSet: { likes: req?.user?._id },
        };
    const updatedComment = await this._commnetModel.findOneAndUpdate(
      { _id: commentId },
      updateQuery,
    );
    if (!updatedComment)
      throw new BadRequestException("Fail to update comment.");
    let recipients: string[] = [];
    const userId = req?.user?._id.toString() as unknown as string;
    const parentCommentId = comment.commentId?.toString() ?? null;
    if (post.availability === AvailabilityEnum.FRIENDS) {
      recipients = [
        ...(req?.user?.friends?.map((id) => id.toString()) || []),
        userId,
      ];
      io.to(recipients).emit("like_comment", {
        postId: post?._id,
        userId,
        action: isLiked ? "unlike" : "like",
        commentId,
        parentCommentId,
      });
    } else if (post.availability === AvailabilityEnum.ONLY_ME) {
      recipients = [userId];
      io.to(recipients).emit("like_comment", {
        postId: post?._id,
        userId,
        commentId,
        action: isLiked ? "unlike" : "like",
        parentCommentId,
      });
    } else {
      io.emit("like_comment", {
        postId: post?._id,
        userId,
        action: isLiked ? "unlike" : "like",
        commentId,
        parentCommentId,
      });
    }
    // notify comment author on like
    if (!isLiked) {
      await createNotification({
        recipient: comment.createdBy as unknown as Types.ObjectId,
        sender: req.user!._id as unknown as Types.ObjectId,
        type: NotificationTypeEnum.COMMENT_LIKE,
        message: `${req.user?.username ?? "Someone"} liked your comment.`,
        refId: comment._id as unknown as Types.ObjectId,
        refModel: "Comment",
      });
    }
    return successResponse({ res });
  };

  // update comment
  updateComment = async (req: Request, res: Response): Promise<Response> => {
    const {
      content,
      attachments,
      tags,
      removedAttachments,
      removedTags,
    }: UpdateCommentBodyDto = req.body as unknown as UpdateCommentBodyDto;
    const { commentId, postId }: UpdateCommentParamsDto =
      req.params as unknown as UpdateCommentParamsDto;
    const post = await this._postModel.findOne({
      _id: postId,
      $or: getPostAvailability(req),
      allowComments: AllowCommentsEnum.ALLOW,
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    const comment = await this._commnetModel.findOne({
      _id: commentId,
      createdBy: req?.user?._id as unknown as Types.ObjectId,
    });
    if (!comment) throw new NotFoundException("Fail to find matched comment.");
    if (
      tags?.length &&
      (
        await this._userModel.find({
          _id: { $in: tags, $ne: req?.user?._id! },
        })
      ).length !== tags?.length
    ) {
      throw new NotFoundException("some of mentioned users does not exist.");
    }
    let attachmentsKeys;
    if (attachments?.length) {
      attachmentsKeys = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `user/${post.createdBy}/post/${post?.assetsFolderId}`,
      });
    }
    const updatedComment = await this._commnetModel.findOneAndUpdate(
      {
        _id: commentId,
        createdBy: req?.user?._id as unknown as Types.ObjectId,
      },
      [
        {
          $set: {
            content: content as string,
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
                      return Types.ObjectId.createFromHexString(tag);
                    }) || [],
                  ],
                },
                tags?.map((tag) => Types.ObjectId.createFromHexString(tag)) ||
                  [],
              ],
            },
          },
        },
      ],
      { new: true }, // ← return the updated document so socket sends correct data
    );
    if (!updatedComment) {
      await deleteFiles({
        keys: attachmentsKeys as string[],
      });
      throw new BadRequestException("Fail to update comment.");
    }
    if (removedAttachments?.length)
      await deleteFiles({ keys: removedAttachments as string[] });
    let recipients: string[] = [];
    const userId = req?.user?._id.toString() as unknown as string;
    const parentCommentId = comment.commentId?.toString() ?? null;
    await updatedComment.populate([
      {
        path: "createdBy",
      },
      {
        path: "tags",
      },
    ]);
    if (post.availability === AvailabilityEnum.FRIENDS) {
      recipients = [
        ...(req?.user?.friends?.map((id) => id.toString()) || []),
        userId,
      ];
      io.to(recipients).emit("update_comment", {
        updatedComment,
        parentCommentId,
      });
    } else if (post.availability === AvailabilityEnum.ONLY_ME) {
      recipients = [userId];
      io.to(recipients).emit("update_comment", {
        updatedComment,
        parentCommentId,
      });
    } else {
      io.emit("update_comment", { updatedComment, parentCommentId });
    }
    return successResponse({ res });
  };

  // get comments
  getComments = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: GetCommentsParamsDto =
      req.params as unknown as GetCommentsParamsDto;
    const {
      after,
      limit = 10,
      cursor,
    }: GetCommentsQueryDto = req.query as unknown as GetCommentsQueryDto;
    const post = await this._postModel.findOne({
      _id: postId,
      $or: getPostAvailability(req),
      allowComments: AllowCommentsEnum.ALLOW,
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    const totalCount = (await commentModel.countDocuments({
      postId: Types.ObjectId.createFromHexString(postId) as any,
      deletedAt: { $exists: false },
    })) as unknown as HCommentDocument;
    const filterQuery: QueryFilter<CommentType> = {
      postId: Types.ObjectId.createFromHexString(postId),
      commentId: { $exists: false },
    };
    if (cursor) filterQuery.createdAt = { $lt: new Date(cursor) };
    else if (after) filterQuery.createdAt = { $gt: new Date(after) };
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
    return successResponse<GetCommentsResponseType>({
      res,
      data: {
        nextCursor: comments.length
          ? (comments[comments.length - 1]?.createdAt as unknown as string)
          : "",
        count: totalCount as unknown as number,
        comments: comments.slice(0, parseInt(limit as unknown as string)),
      },
    });
  };

  // get replies for a comment
  getReplies = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId }: { postId: string; commentId: string } =
      req.params as unknown as { postId: string; commentId: string };
    const { cursor, limit = 10 } = req.query as unknown as {
      cursor?: string;
      limit?: number;
    };
    const post = await this._postModel.findOne({
      _id: postId,
      $or: getPostAvailability(req),
      allowComments: AllowCommentsEnum.ALLOW,
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    const filterQuery: QueryFilter<CommentType> = {
      postId: Types.ObjectId.createFromHexString(postId),
      commentId: Types.ObjectId.createFromHexString(commentId),
    };
    if (cursor) filterQuery.createdAt = { $gt: new Date(cursor) };
    let replies = await this._commnetModel.find(filterQuery, undefined, {
      sort: { createdAt: -1 },
      populate: [{ path: "createdBy" }, { path: "tags" }],
    });
    const count = replies.length;
    return successResponse({
      res,
      data: {
        replies: replies.slice(0, parseInt(limit as unknown as string)),
        count,
        nextCursor: replies.length
          ? (replies[replies.length - 1]?.createdAt as unknown as string)
          : "",
      },
    });
  };

  // freeze comment
  freezeComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId }: FreezeCommentParamsDto =
      req.params as unknown as FreezeCommentParamsDto;
    const post = await this._postModel.findOne({ _id: postId });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    const comment = await this._commnetModel.findOne({
      _id: commentId,
      paranoid: false,
      deletedAt: { $exists: false },
    });
    if (!comment) throw new NotFoundException("Fail to find matched comment.");
    const isAdmin = req?.user?.role === RoleEnum.ADMIN;
    const isPostOwner =
      req?.user?._id?.toString() === post?.createdBy?.toString();
    const isCommentOwner =
      req?.user?._id?.toString() === comment?.createdBy?.toString();
    if (!isAdmin && !isPostOwner && !isCommentOwner)
      throw new ForbiddenException(
        "You are not allowed to freeze this comment.",
      );

    const repliesCount = await commentModel.countDocuments({
      commentId,
      postId,
      deletedAt: { $exists: false },
    });

    const updatedComment = await this._commnetModel.updateOne(
      { _id: commentId },
      {
        deletedAt: new Date(),
        deletedBy: req?.user?._id,
        $unset: { reStoredAt: "", reStoredBy: "" },
      },
    );
    if (!updatedComment.matchedCount)
      throw new BadRequestException("Fail to freeze comment.");

    const userId = req?.user?._id.toString() as unknown as string;
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

    if (post.availability === AvailabilityEnum.PUBLIC) {
      io.emit("remove_comment", payload);
    } else if (post.availability === AvailabilityEnum.FRIENDS) {
      io.to(getFriendsWithMe() as string[]).emit("remove_comment", payload);
    } else {
      io.to(userId).emit("remove_comment", payload);
    }

    return successResponse({ res });
  };

  // restore comment
  restoreComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId }: ReStoreCommentParamsDto =
      req.params as unknown as ReStoreCommentParamsDto;
    const post = await this._postModel.findOne({
      _id: postId,
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    const comment = await this._commnetModel.findOne({
      _id: commentId,
      paranoid: false,
      deletedAt: { $exists: true },
    });
    if (!comment) throw new NotFoundException("Fail to find matched comment.");
    const isAdmin = req?.user?.role === RoleEnum.ADMIN;
    const iscommentOwner =
      req?.user?._id?.toString() === comment?.createdBy?.toString();
    if (!isAdmin && !iscommentOwner)
      throw new ForbiddenException(
        "You are not allowed to restore this comment.",
      );
    const updateComment = await this._commnetModel.updateOne(
      {
        _id: commentId,
      },
      {
        reStoredAt: new Date(),
        reStoredBy: req?.user?._id as unknown as Types.ObjectId,
        $unset: { deletedAt: "", deletedBy: "" },
      },
    );
    if (!updateComment.matchedCount)
      throw new NotFoundException("Fail to restore comment.");
    return successResponse({ res });
  };

  // delete comment
  deleteComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId }: DeleteCommentParamsDto =
      req.params as unknown as DeleteCommentParamsDto;
    const post = await this._postModel.findOne({
      _id: postId,
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    const comment = await this._commnetModel.findOneAndDelete({
      _id: commentId,
      paranoid: false,
      deletedAt: { $exists: true },
    });
    if (!comment) throw new NotFoundException("Fail to find matched comment.");
    if (comment?.attachments?.length) {
      await deleteFiles({
        keys: comment?.attachments as string[],
      });
    }
    return successResponse({ res });
  };
}

export default new CommentService();
