import { HChatDocument } from "../../DB/models/chat.model";
import { CommentType, PostType, RoleEnum, UserType } from "../../utils/types";

export type GetProfileResponseType = {
  user: UserType;
};
export type UserResponseType = {
  credentials: {
    access_token: string;
    refresh_token: string;
  };
  role?: RoleEnum;
};

export type ChatResponseType = {
  chat: Partial<HChatDocument>;
};
export type UploadProfileImageResponseType = {
  key: string;
};

export type UploadCoverImageResponseType = {
  urls: string[];
};

export type GetPostsResponseType = {
  posts: PostType[];
  nextCursor: string;
};

export type GetNewPostsQueryResponseType = {
  posts: PostType[];
};

export type SharePostResponseType = {
  post: PostType;
};

export type GetPostResponseType = {
  post: PostType;
};

export type GetCommentsResponseType = {
  comments: CommentType[];
  nextCursor: string;
  count?: number;
};

export type GetRepliesResponseType = {
  replies: CommentType[];
  nextCursor: string;
};
