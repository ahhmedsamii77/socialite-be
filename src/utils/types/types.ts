import type { Request } from "express";
import { Types } from "mongoose";
import type { ZodType } from "zod";
import { HUserDocument } from "../../DB/models/user.model";
import { JwtPayload } from "jsonwebtoken";
import { HPostDocument } from "../../DB/models/post.model";

export type ReqType = keyof Request;

export type SchemaType = Partial<Record<ReqType, ZodType>>;

export type UserType = {
  _id: Types.ObjectId;
  fName?: string;
  lName?: string;
  username?: string;
  email: string;
  confirmedAt?: Date;
  password: string;
  phone?: string;
  address?: string;
  gender: GenderEnum;
  role: RoleEnum;
  createdAt: Date;
  updatedAt?: Date;
  profileImage?: string;
  tempProfileImage?: string;
  coverImages?: string;
  changeCredentialsTime?: Date;
  friends?: Types.ObjectId[];
  otp?: OtpType[];
  savedPosts?: Types.ObjectId[];
  provider?: ProviderTypeEnum;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  reStoredAt?: Date;
  reStoredBy?: Types.ObjectId;
};

export type OtpType = {
  code: string;
  createdAt: Date;
  expireAt: Date;
  userId: Types.ObjectId;
  type: OtpTypeEnum;
  isVerified?: boolean;
};

export enum OtpTypeEnum {
  FORGOT_PASSWORD = "forgot_password",
  CONFIRM_EMAIL = "confirm_email",
}

export enum GenderEnum {
  MALE = "male",
  FEMALE = "female",
}

export enum RoleEnum {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super-admin",
}

export enum TokenTypeEnum {
  ACCESS_TOKEN = "access_token",
  REFRESH_TOKEN = "refresh_token",
}

export enum SignatureLevel {
  BEARER = "Bearer",
  SYSTEM = "System",
}

declare module "express-serve-static-core" {
  export interface Request {
    user?: HUserDocument;
    decoded?: JwtPayload;
  }
}

export enum FlagTypeEnum {
  ALL = "all",
  SINGLE = "single",
}

export type RevokeTokenType = {
  userId: Types.ObjectId;
  expireIn: Date;
  jti: string;
};

export enum ProviderTypeEnum {
  GOOGLE = "google",
  SYSTEM = "system",
}

export enum StorageApproachEnum {
  MEMORY = "memory",
  DISK = "disk",
}

export type PostType = {
  createdBy: Types.ObjectId;
  content?: string;
  attachments?: string[];
  tags?: Types.ObjectId[];
  likes?: Types.ObjectId[];
  allowComments?: AllowCommentsEnum;
  availability?: AvailabilityEnum;
  assetsFolderId?: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  reStoredAt?: Date;
  reStoredBy?: Types.ObjectId;
};

export enum AllowCommentsEnum {
  ALLOW = "allow",
  DENY = "deny",
}

export enum AvailabilityEnum {
  PUBLIC = "public",
  ONLY_ME = "only_me",
  FRIENDS = "friends",
}

export type CommentType = {
  createdBy: Types.ObjectId;
  content?: string;
  attachments?: string[];
  likes?: Types.ObjectId[];
  tags?: Types.ObjectId[];
  postId: Types.ObjectId | Partial<HPostDocument>;
  commentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  reStoredAt?: Date;
  reStoredBy?: Types.ObjectId;
};

export type FriendRequestType = {
  createdBy: Types.ObjectId;
  sendTo: Types.ObjectId;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  reStoredAt?: Date;
  reStoredBy?: Types.ObjectId;
};

export type ChatType = {
  // ovo
  participants: Types.ObjectId[];
  createdBy: Types.ObjectId;
  messages: MessageType[];

  // ovm
  groupName?: string;
  groupImage?: string;
  roomId?: string;

  // soft delete
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
};

export type MessageType = {
  _id?: Types.ObjectId;
  createdBy: Types.ObjectId;
  content?: string;
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  // soft delete
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
};
