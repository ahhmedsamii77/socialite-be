import type { Request, Response } from "express";
import {
  createPostDto,
  DeletePostDto,
  FreezePostDto,
  GetPostDto,
  GetPostsQueryDto,
  LikePostDto,
  ReStorePostDto,
  SharePostDto,
  updatedPostBodyDto,
  updatedPostParamsDto,
  SavedPostsDto,
} from "./post.dto";
import {
  deleteFiles,
  deleteFolderByPrefix,
  uploadFiles,
} from "../../utils/aws/s3.config";
import { v4 as uuid } from "uuid";
import {
  BadRequestException,
  NotFoundException,
  successResponse,
} from "../../utils/res";
import { PostRepository, UserRepository } from "../../DB/repositories";
import { userModel } from "../../DB/models/user.model";
import { postModel } from "../../DB/models/post.model";
import { Types } from "mongoose";
import {
  AllowCommentsEnum,
  AvailabilityEnum,
  GetPostResponseType,
  GetPostsResponseType,
  PostType,
  RoleEnum,
  SharePostResponseType,
} from "../../utils/types";
import { QueryFilter } from "mongoose";
import { io } from "../gateway";
import {
  createNotification,
  NotificationTypeEnum,
} from "../notification/notification.service";

// get post availability
export function getPostAvailability(req: Request) {
  return [
    { availability: AvailabilityEnum.PUBLIC },
    {
      availability: AvailabilityEnum.ONLY_ME,
      createdBy: req?.user?._id as unknown as Types.ObjectId,
    },
    {
      availability: AvailabilityEnum.FRIENDS,
      createdBy: {
        $in: [
          req?.user?._id as unknown as Types.ObjectId,
          ...(req?.user?.friends || []),
        ],
      },
    },
    {
      availability: {
        $in: [AvailabilityEnum.PUBLIC, AvailabilityEnum.FRIENDS],
      },
      tags: req?.user?._id as unknown as Types.ObjectId,
    },
  ];
}

// post service
class PostService {
  private _userModel = new UserRepository(userModel);
  private _postModel = new PostRepository(postModel);
  constructor() {}

  // create post
  createPost = async (req: Request, res: Response): Promise<Response> => {
    let {
      content,
      attachments,
      tags,
      allowComments,
      availability,
    }: createPostDto = req.body as unknown as createPostDto;
    const assetsFolderId = uuid();
    let attachmentsKeys;
    if (attachments?.length) {
      attachmentsKeys = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `user/${req?.user?.id}/post/${assetsFolderId}`,
      });
    }

    if (
      tags?.length &&
      (await this._userModel.find({ _id: { $in: tags, $ne: req?.user?._id! } }))
        .length !== tags?.length
    ) {
      throw new NotFoundException("some of mentioned users does not exist.");
    }

    const post = await this._postModel.create({
      content: content as unknown as string,
      assetsFolderId: assetsFolderId as unknown as string,
      attachments: attachmentsKeys as unknown as string[],
      tags: tags as unknown as Types.ObjectId[],
      allowComments: allowComments as unknown as AllowCommentsEnum,
      availability: availability as unknown as AvailabilityEnum,
      createdBy: req?.user?._id as unknown as Types.ObjectId,
    });
    if (!post) {
      await deleteFiles({
        keys: attachmentsKeys as unknown as string[],
      });
      throw new BadRequestException("Failed to create post.");
    }

    let recipients: string[] = [];
    const userId = req?.user?._id.toString() as unknown as string;
    await post.populate([
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
      io.to(recipients).emit("new_post", post);
    } else if (post.availability === AvailabilityEnum.ONLY_ME) {
      recipients = [userId];
      io.to(recipients).emit("new_post", post);
    } else {
      io.emit("new_post", post);
    }
    if (tags?.length) {
      const tagIds = tags.map((tag) => tag.toString());
      io.to(tagIds).emit("tagged_post", post);
      // notify each tagged user
      await Promise.allSettled(
        tags.map((tagId) =>
          createNotification({
            recipient: tagId as unknown as Types.ObjectId,
            sender: req.user!._id as unknown as Types.ObjectId,
            type: NotificationTypeEnum.POST_LIKE,
            message: `${req.user?.username ?? "Someone"} tagged you in a post.`,
            refId: post._id as unknown as Types.ObjectId,
            refModel: "Post",
          }),
        ),
      );
    }
    return successResponse({ res, statusCode: 201 });
  };

  // like and dislike post
  likePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: LikePostDto = req.params as unknown as LikePostDto;
    const post = await this._postModel.findOne({
      _id: postId,
      $or: getPostAvailability(req),
    });
    if (!post) throw new NotFoundException("post not found.");
    const isLiked = post?.likes?.some(
      (id) => id.toString() === req?.user?._id?.toString(),
    );
    const updateQuery = isLiked
      ? { $pull: { likes: req?.user?._id as unknown as Types.ObjectId } }
      : { $addToSet: { likes: req?.user?._id as unknown as Types.ObjectId } };
    const updatedPost = await this._postModel.findOneAndUpdate(
      { _id: post._id },
      updateQuery,
    );
    if (!updatedPost)
      throw new BadRequestException(
        `Failed to ${isLiked ? "unlike" : "like"} post.`,
      );

    let recipients: string[] = [];
    const userId = req?.user?._id.toString() as unknown as string;
    if (post.availability === AvailabilityEnum.FRIENDS) {
      recipients = [
        ...(req?.user?.friends?.map((id) => id.toString()) || []),
        userId,
      ];
      io.to(recipients).emit("like_post", {
        postId: post?._id,
        userId,
        action: isLiked ? "unlike" : "like",
      });
    } else if (post.availability === AvailabilityEnum.ONLY_ME) {
      recipients = [userId];
      io.to(recipients).emit("like_post", {
        postId: post?._id,
        userId,
        action: isLiked ? "unlike" : "like",
      });
    } else {
      io.emit("like_post", {
        postId: post?._id,
        userId,
        action: isLiked ? "unlike" : "like",
      });
    }
    // notify post owner on like (not self-like)
    if (!isLiked) {
      await createNotification({
        recipient: post.createdBy as unknown as Types.ObjectId,
        sender: req.user!._id as unknown as Types.ObjectId,
        type: NotificationTypeEnum.POST_LIKE,
        message: `${req.user?.username ?? "Someone"} liked your post.`,
        refId: post._id as unknown as Types.ObjectId,
        refModel: "Post",
      });
    }
    return successResponse({ res });
  };

  // update post
  updatePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: updatedPostParamsDto =
      req.params as unknown as updatedPostParamsDto;

    const {
      content,
      attachments,
      tags,
      allowComments,
      availability,
      removedAttachments,
      removedTags,
    }: updatedPostBodyDto = req.body as unknown as updatedPostBodyDto;

    const post = await this._postModel.findOne({
      _id: postId,
      createdBy: req?.user?._id as unknown as Types.ObjectId,
    });

    if (!post) throw new NotFoundException("Fail to find matched post.");

    if (
      tags?.length &&
      (await this._userModel.find({ _id: { $in: tags, $ne: req?.user?._id! } }))
        .length !== tags?.length
    ) {
      throw new NotFoundException("some of mentioned users does not exist.");
    }

    let attachmentsKeys;
    if (attachments?.length) {
      attachmentsKeys = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `user/${req?.user?.id}/post/${post.assetsFolderId}`,
      });
    }

    const oldAvailability = post.availability;

    const updatedPost = await this._postModel.findOneAndUpdate(
      { _id: post._id },
      [
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
                    (removedTags || []).map((tag) =>
                      Types.ObjectId.createFromHexString(tag),
                    ),
                  ],
                },
                (tags || []).map((tag) =>
                  Types.ObjectId.createFromHexString(tag),
                ),
              ],
            },
          },
        },
      ],
      { new: true },
    );

    if (!updatedPost) {
      await deleteFiles({ keys: attachmentsKeys as string[] });
      throw new BadRequestException("Failed to update post.");
    }

    if (removedAttachments?.length) {
      await deleteFiles({ keys: removedAttachments as string[] });
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
      if (oldAvailability === AvailabilityEnum.PUBLIC) {
        io.emit("remove_post", { postId: updatedPost._id });
      } else if (oldAvailability === AvailabilityEnum.FRIENDS) {
        io.to(getFriendsWithMe() as string[]).emit("remove_post", {
          postId: updatedPost._id,
        });
      } else if (oldAvailability === AvailabilityEnum.ONLY_ME) {
        io.to(userId as unknown as string).emit("remove_post", {
          postId: updatedPost._id,
        });
      }

      if (newAvailability === AvailabilityEnum.PUBLIC) {
        io.emit("new_post", updatedPost);
      } else if (newAvailability === AvailabilityEnum.FRIENDS) {
        io.to(getFriendsWithMe() as string[]).emit("new_post", updatedPost);
      } else if (newAvailability === AvailabilityEnum.ONLY_ME) {
        io.to(userId as unknown as string).emit("new_post", updatedPost);
      }
    } else {
      if (newAvailability === AvailabilityEnum.PUBLIC) {
        io.emit("updated_post", updatedPost);
      } else if (newAvailability === AvailabilityEnum.FRIENDS) {
        io.to(getFriendsWithMe() as string[]).emit("updated_post", updatedPost);
      } else {
        io.to(userId as unknown as string).emit("updated_post", updatedPost);
      }
    }
    return successResponse({ res });
  };

  // get posts
  getPosts = async (req: Request, res: Response): Promise<Response> => {
    const {
      cursor,
      limit = 5,
      after,
    }: GetPostsQueryDto = req.query as unknown as GetPostsQueryDto;
    const filter: QueryFilter<PostType> = { $or: getPostAvailability(req) };
    if (after && cursor)
      throw new BadRequestException(
        "Cannot use after and cursor at the same time.",
      );
    if (after) filter.createdAt = { $gt: new Date(after as string) };
    if (cursor) filter.createdAt = { $lt: new Date(cursor as string) };
    const posts = await this._postModel.find(filter, undefined, {
      sort: { createdAt: -1 },
      limit: parseInt(limit as unknown as string),
      populate: [
        {
          path: "createdBy",
        },
        {
          path: "tags",
        },
      ],
    });
    return successResponse<GetPostsResponseType>({
      res,
      data: {
        nextCursor: posts.length
          ? (posts[posts.length - 1]?.createdAt as unknown as string)
          : "",
        posts,
      },
    });
  };

  // freeze post
  freezePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: FreezePostDto = req.params as unknown as FreezePostDto;
    const filter: QueryFilter<PostType> = {
      _id: postId,
      deletedAt: { $exists: false },
      paranoid: false,
    };
    if (req?.user?.role === RoleEnum.USER)
      filter.createdBy = req?.user?._id as unknown as Types.ObjectId;
    const post = await this._postModel.findOneAndUpdate(filter, {
      deletedAt: new Date(),
      deletedBy: req?.user?._id as unknown as Types.ObjectId,
      $unset: {
        reStoredAt: "",
        reStoredBy: "",
      },
    });
    if (!post)
      throw new NotFoundException(
        "Fail to find matched post or you are not authorized to freeze this post.",
      );
    const userId = req?.user?._id.toString();
    const getFriendsWithMe = () => [
      ...(req?.user?.friends?.map((id) => id.toString()) || []),
      userId,
    ];
    if (post.availability === AvailabilityEnum.PUBLIC) {
      io.emit("remove_post", { postId: post._id });
    } else if (post.availability === AvailabilityEnum.FRIENDS) {
      io.to(getFriendsWithMe() as string[]).emit("remove_post", {
        postId: post._id,
      });
    } else if (post.availability === AvailabilityEnum.ONLY_ME) {
      io.to(userId as unknown as string).emit("remove_post", {
        postId: post._id,
      });
    }
    return successResponse({ res });
  };

  // restore post
  restorePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: ReStorePostDto = req.params as unknown as ReStorePostDto;
    const filter: QueryFilter<PostType> = {
      _id: postId,
      deletedAt: { $exists: true },
      paranoid: false,
    };
    // Regular users can only restore their own posts that they froze themselves
    // Admins / Super-admins can restore any frozen post
    if (req?.user?.role === RoleEnum.USER) {
      filter.deletedBy = req?.user?._id as unknown as Types.ObjectId;
      filter.createdBy = req?.user?._id as unknown as Types.ObjectId;
    }

    const post = await this._postModel.findOneAndUpdate(filter, {
      reStoredAt: new Date(),
      reStoredBy: req?.user?._id as unknown as Types.ObjectId,
      $unset: {
        deletedAt: "",
        deletedBy: "",
      },
    });
    if (!post)
      throw new NotFoundException(
        "Fail to find matched post or you are not authorized to restore this post.",
      );
    return successResponse({ res });
  };

  // hard delete
  deletePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: DeletePostDto = req.params as unknown as DeletePostDto;
    const post = await this._postModel.findOneAndDelete({
      _id: postId,
      paranoid: false,
      deletedAt: { $exists: true },
    });
    if (!post) throw new NotFoundException("Fail to find matched post.");
    // Silently clean up S3 assets — empty/missing folder is not an error
    if (post?.attachments?.length) {
      await deleteFolderByPrefix({
        path: `user/${post.createdBy}/post/${post.assetsFolderId}`,
      }).catch(() => null);
    }
    return successResponse({ res });
  };

  // share post
  sharePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: SharePostDto = req.params as unknown as SharePostDto;
    const post = await this._postModel.findOne(
      {
        _id: postId,
        $or: getPostAvailability(req),
      },
      undefined,
      {
        populate: [
          {
            path: "createdBy",
          },
          {
            path: "tags",
          },
        ],
      },
    );
    if (!post) throw new NotFoundException("Fail to find matched post.");
    return successResponse<SharePostResponseType>({
      res,
      data: {
        post,
      },
    });
  };

  // get post
  getPost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: GetPostDto = req.params as unknown as GetPostDto;
    const post = await this._postModel.findOne(
      {
        _id: postId,
        $or: getPostAvailability(req),
      },
      undefined,
      {
        populate: [
          {
            path: "createdBy",
          },
          {
            path: "tags",
          },
        ],
      },
    );
    if (!post) throw new NotFoundException("Fail to find matched post.");
    return successResponse<GetPostResponseType>({
      res,
      data: {
        post,
      },
    });
  };

  // save and unsave post
  savePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId }: SavedPostsDto = req.params as unknown as SavedPostsDto;
    const post = await this._postModel.findOne({
      _id: postId,
      $or: getPostAvailability(req),
    });
    if (!post) throw new NotFoundException("post not found.");
    const isSaved = req?.user!.savedPosts!.some(
      (id) => id.toString() === postId,
    );
    const updateQuery = isSaved
      ? { $pull: { savedPosts: postId as unknown as Types.ObjectId } }
      : { $addToSet: { savedPosts: postId as unknown as Types.ObjectId } };
    const savedPosts = await this._userModel.findOneAndUpdate(
      { _id: req?.user?._id as unknown as Types.ObjectId },
      updateQuery,
    );
    if (!savedPosts)
      throw new BadRequestException(
        `Failed to ${isSaved ? "unsave" : "save"} post.`,
      );
    return successResponse({ res });
  };
}

export default new PostService();
