import type { Request, Response } from "express";
import {
  AcceptRequestDto,
  ChangeRoleBodyDto,
  ChangeRoleParamsDto,
  FreezeAccountDto,
  HardDeleteAccountDto,
  LogoutType,
  RejectRequestDto,
  RemoveFriendDto,
  ReStoreAccountDto,
  SendRequsetDto,
  shareProfileDto,
  UpdatePasswordDto,
  UpdateProfileDto,
} from "./user.dto";

import {
  FlagTypeEnum,
  OtpTypeEnum,
  RoleEnum,
  UserType,
} from "../../utils/types/types";
import {
  FriendRequestRepository,
  PostRepository,
  RevokeTokenRepository,
  UserRepository,
  ChatRepository,
} from "../../DB/repositories";
import { revokeTokenModel } from "../../DB/models/revokeToken.model";
import {
  compareHash,
  createLoginCredentials,
  decrypt,
} from "../../utils/security";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "../../utils/res/res.error";
import { userModel } from "../../DB/models/user.model";
import { QueryFilter, Types } from "mongoose";
import AS from "../auth/auth.service";
import {
  deleteFile,
  deleteFiles,
  deleteFolderByPrefix,
  uploadFile,
  uploadFiles,
} from "../../utils/aws/s3.config";

import { successResponse } from "../../utils/res";
import {
  GetProfileResponseType,
  UserResponseType,
  UploadCoverImageResponseType,
  UploadProfileImageResponseType,
} from "../../utils/types";
import { postModel } from "../../DB/models/post.model";
import { chatModel } from "../../DB/models/chat.model";
import { friendRequestModel } from "../../DB/models/friendRequest.model";
import { io } from "../gateway";
import {
  createNotification,
  NotificationTypeEnum,
} from "../notification/notification.service";
class UserService {
  private _revokeTokenModel = new RevokeTokenRepository(revokeTokenModel);
  private _userModel = new UserRepository(userModel);
  private _postModel = new PostRepository(postModel);
  private _chatModel = new ChatRepository(chatModel);
  private _friendRequestModel = new FriendRequestRepository(friendRequestModel);
  constructor() {}

  // get user profile
  getProfile = async (req: Request, res: Response): Promise<Response> => {
    const user = await this._userModel.findOne(
      { _id: req.user!._id },
      undefined,
      {
        populate: [
          {
            path: "friends",
          },
          {
            path: "posts",
            match: {
              deletedAt: { $exists: false },
            },
          },
        ],
      },
    );
    if (user?.phone) {
      user!.phone = await decrypt(
        user!.phone as unknown as string,
        process.env.PHONE_KEY!,
      );
    }
    return successResponse<GetProfileResponseType>({
      res,
      data: {
        user: user as unknown as UserType,
      },
    });
  };

  // logout
  logOut = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: LogoutType = req.body;
    if (flag === FlagTypeEnum.ALL) {
      req.user!.changeCredentialsTime = new Date();
      req.user!.__v += 1;
      await req.user!.save();
      return res.status(200).json({
        message: "Done",
      });
    }
    const revokeToken = this._revokeTokenModel.create({
      userId: req.user!._id,
      jti: req?.decoded!.jti as string,
      expireIn: new Date((req?.decoded!.exp as number) * 1000),
    });
    if (!revokeToken) throw new BadRequestException("Failed to revoke token");
    return successResponse({ res, statusCode: 201 });
  };

  // refresh token
  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const revokeToken = await this._revokeTokenModel.create({
      userId: req.user!._id,
      jti: req?.decoded!.jti as string,
      expireIn: new Date((req?.decoded!.exp as number) * 1000),
    });
    if (!revokeToken) throw new BadRequestException("Failed to revoke token");
    const { access_token, refresh_token } = await createLoginCredentials(
      req.user!,
    );
    return successResponse<UserResponseType>({
      res,
      data: {
        credentials: {
          access_token,
          refresh_token,
        },
      },
    });
  };

  // update password (for logged in user)
  updatePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword }: UpdatePasswordDto = req.body;
    if (!(await compareHash(currentPassword, req?.user?.password!))) {
      throw new BadRequestException("Current password is incorrect");
    }
    req!.user!.password = newPassword;
    req!.user!.changeCredentialsTime = new Date();
    req!.user!.__v += 1;
    await req!.user!.save();
    return successResponse({ res });
  };

  // share profile
  shareProfile = async (req: Request, res: Response) => {
    const { userId }: shareProfileDto = req.params as shareProfileDto;
    const user = await this._userModel.findOne(
      {
        _id: userId as unknown as Types.ObjectId,
        confirmedAt: { $exists: true },
      },
      undefined,
      {
        populate: [
          {
            path: "friends",
          },
          {
            path: "posts",
            match: {
              deletedAt: { $exists: false },
            },
            populate: [
              {
                path: "createdBy",
              },
              {
                path: "tags",
              },
            ],
          },
        ],
      },
    );
    if (!user) throw new NotFoundException("Fail to find matching account.");
    return successResponse<GetProfileResponseType>({ res, data: { user } });
  };

  // get all user
  getAllUser = async (req: Request, res: Response) => {
    const { search, users: usersIds } = req.query as {
      search: string;
      users: string;
    };

    const filter: QueryFilter<UserType> = {
      confirmedAt: { $exists: true },
      _id: { $ne: req.user!._id }, // never return the requesting user themselves
    };

    if (usersIds?.length) {
      (filter["_id"] as any)["$in"] = usersIds
        .split(",")
        .map((id) => new Types.ObjectId(id));
    }

    const terms = (search ?? "").trim().split(/\s+/).filter(Boolean);

    if (terms.length) {
      filter["$and"] = terms.map((term) => ({
        $or: [
          { fName: { $regex: term, $options: "i" } },
          { lName: { $regex: term, $options: "i" } },
          { username: { $regex: term, $options: "i" } },
        ],
      }));
    }

    const users = await this._userModel.find(filter);

    return successResponse({ res, data: { users } });
  };

  // get friends list (for chat group modal, etc.)
  getFriends = async (req: Request, res: Response) => {
    const me = await this._userModel.findOne(
      { _id: req.user!._id },
      undefined,
      {
        populate: [{
          path: "friends",
          select: "fName lName username profileImage",
        }],
      },
    );
    const friends = (me?.friends ?? []) as unknown as UserType[];
    return successResponse({ res, data: { friends } });
  };

  // get incoming friend requests
  getIncomingRequests = async (req: Request, res: Response) => {
    const requests = await this._friendRequestModel.find(
      { sendTo: req.user!._id, acceptedAt: { $exists: false } },
      undefined,
      {
        populate: [
          {
            path: "createdBy",
            select: "fName lName username profileImage address friends",
          },
        ],
      },
    );
    const users = requests
      .map((r) => r.toObject())
      .filter((r) => r.createdBy)
      .map((r) => ({
        ...(r.createdBy as any),
        requestId: r._id,
      }));
    return successResponse({ res, data: { users } });
  };

  // get outgoing friend requests
  getOutgoingRequests = async (req: Request, res: Response) => {
    const requests = await this._friendRequestModel.find(
      { createdBy: req.user!._id, acceptedAt: { $exists: false } },
      undefined,
      {
        populate: [
          {
            path: "sendTo",
            select: "fName lName username profileImage address friends",
          },
        ],
      },
    );
    const users = requests
      .map((r) => r.toObject())
      .filter((r) => r.sendTo)
      .map((r) => ({
        ...(r.sendTo as any),
        requestId: r._id,
      }));
    return successResponse({ res, data: { users } });
  };

  // get friend suggestions
  getSuggestions = async (req: Request, res: Response) => {
    const currentUser = await this._userModel.findById(
      req.user!._id as unknown as Types.ObjectId,
      { friends: 1 },
    );

    const myFriends = (currentUser?.friends ||
      []) as unknown as Types.ObjectId[];

    // Also exclude people who already sent/received a friend request
    const pendingRequests = await this._friendRequestModel.find({
      $or: [{ createdBy: req.user!._id }, { sendTo: req.user!._id }],
    });
    const pendingIds = pendingRequests.flatMap((r) => [r.createdBy, r.sendTo]);

    const suggestions = await userModel.aggregate([
      {
        $match: {
          confirmedAt: { $exists: true },
          _id: {
            $nin: [
              new Types.ObjectId(req.user!._id),
              ...myFriends,
              ...pendingIds,
            ],
          },
        },
      },
      {
        $addFields: {
          mutualFriends: {
            $setIntersection: [{ $ifNull: ["$friends", []] }, myFriends],
          },
        },
      },
      {
        $addFields: {
          mutualFriendsCount: { $size: { $ifNull: ["$mutualFriends", []] } },
        },
      },
      { $sort: { mutualFriendsCount: -1, createdAt: -1 } },
      { $limit: 4 },
      {
        $project: {
          fName: 1,
          lName: 1,
          username: 1,
          profileImage: 1,
          mutualFriendsCount: 1,
        },
      },
    ]);

    return successResponse({ res, data: { suggestions } });
  };

  // update profile (for logged in user)
  updateProfile = async (req: Request, res: Response) => {
    const {
      fName,
      lName,
      username,
      phone,
      address,
      email,
      gender,
    }: UpdateProfileDto = req.body;
    if (fName) req.user!.fName = fName;
    if (lName) req.user!.lName = lName;
    if (username) req.user!.username = username;
    if (phone) req.user!.phone = phone;
    if (address) req.user!.address = address;
    if (gender) req.user!.gender = gender;
    let isEmailChanged = false;
    if (email) {
      if (
        await this._userModel.findOne({
          email,
          _id: { $ne: req.user!._id },
        })
      ) {
        throw new BadRequestException("Email is already in use");
      }
      req.user!.email = email;
      req.user!.confirmedAt = undefined as unknown as Date;
      req.user!.changeCredentialsTime = new Date();
      isEmailChanged = true;
    }
    req.user!.__v += 1;
    await req.user!.save();

    if (isEmailChanged) {
      await AS.sendOtp(req.user!._id, OtpTypeEnum.CONFIRM_EMAIL);
    }
    return successResponse<GetProfileResponseType>({
      res,
      data: { user: req.user as unknown as UserType },
    });
  };

  // freeze account
  freezeAccount = async (req: Request, res: Response) => {
    const { userId }: FreezeAccountDto = req.params as FreezeAccountDto;
    if (userId && req.user!.role !== RoleEnum.ADMIN)
      throw new UnauthorizedException("Not authorized account.");
    const user = await this._userModel.findOneAndUpdate(
      {
        _id: (userId as unknown as Types.ObjectId) || req.user!._id,
        deletedAt: { $exists: false },
        paranoid: false,
      },
      {
        deletedAt: new Date(),
        deletedBy: req.user!._id,
        changeCredentialsTime: new Date(),
        $unset: { reStoredAt: "", reStoredBy: "" },
      },
    );
    if (!user) throw new NotFoundException("Fail to find matching account.");
    return successResponse({ res });
  };

  // reStore account
  reStoreAccount = async (req: Request, res: Response) => {
    const { userId }: ReStoreAccountDto = req.params as ReStoreAccountDto;
    const user = await this._userModel.findOneAndUpdate(
      {
        _id: userId as unknown as Types.ObjectId,
        deletedAt: { $exists: true },
        deletedBy: { $ne: userId } as unknown as Types.ObjectId,
        paranoid: false,
      },
      {
        $unset: { deletedAt: "", deletedBy: "" },
        reStoredAt: new Date(),
        reStoredBy: req.user!._id,
      },
    );
    if (!user) throw new NotFoundException("Fail to find matching account.");
    return successResponse({ res });
  };

  // hard delete
  DeleteAccount = async (req: Request, res: Response) => {
    const { userId }: HardDeleteAccountDto = req.params as HardDeleteAccountDto;
    const user = await this._userModel.findOneAndDelete({
      _id: userId as unknown as Types.ObjectId,
      deletedAt: { $exists: true },
      paranoid: false,
    });
    if (!user) throw new NotFoundException("Fail to find matching account.");
    if (user?.profileImage || user?.coverImages?.length) {
      await deleteFolderByPrefix({ path: `user/${user._id}` }).catch(() => null);
    }
    return successResponse({ res });
  };

  // upload profile image
  uploadProfileImage = async (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File;
    if (!file) throw new BadRequestException("No image file provided.");

    const key = await uploadFile({
      file,
      path: `user/${req.user!._id}/profileImage`,
    });
    if (!key) throw new BadRequestException("Fail to upload profile image.");

    const oldKey = req.user!.profileImage as unknown as string;

    const user = await this._userModel.findOneAndUpdate(
      { _id: req.user!._id },
      { profileImage: key },
    );
    if (!user) throw new BadRequestException("Fail to update profile image.");

    // Delete the old profile image from S3 if it exists
    if (oldKey) {
      await deleteFile({ Key: oldKey }).catch(() => null);
    }

    return successResponse<UploadProfileImageResponseType>({
      res,
      data: { key },
    });
  };

  // cover images
  uploadCoverImages = async (req: Request, res: Response) => {
    const urls = await uploadFiles({
      files: req.files as Express.Multer.File[],
      path: `user/${req.user!._id}/coverImages`,
    });
    if (!urls) {
      throw new BadRequestException("Fail to upload cover images.");
    }
    const user = await this._userModel.findOneAndUpdate(
      { _id: req.user!._id },
      { coverImages: urls },
    );
    if (!user) {
      if (req.user?.coverImages?.length) {
        await deleteFiles({
          keys: urls as string[],
        });
      }
      throw new BadRequestException("Fail to update cover images.");
    }
    if (req.user?.coverImages?.length) {
      await deleteFiles({
        keys: req.user?.coverImages as unknown as string[],
      });
    }
    return successResponse<UploadCoverImageResponseType>({
      res,
      data: { urls: urls as unknown as string[] },
    });
  };

  // delete profile image
  deleteProfileImage = async (req: Request, res: Response) => {
    const oldKey = req.user!.profileImage as unknown as string;
    if (!oldKey) throw new BadRequestException("No profile image to delete.");

    const user = await this._userModel.findOneAndUpdate(
      { _id: req.user!._id },
      { $set: { profileImage: null } },
      { runValidators: false },
    );
    if (!user) throw new BadRequestException("Failed to delete profile image.");

    // Remove from S3 (silent fail — DB is source of truth)
    await deleteFile({ Key: oldKey }).catch(() => null);

    return successResponse({ res });
  };

  // delete cover images
  deleteCoverImages = async (req: Request, res: Response) => {
    const keys = req.user!.coverImages as unknown as string[];
    if (!keys?.length)
      throw new BadRequestException("No cover images to delete.");

    const user = await this._userModel.findOneAndUpdate(
      { _id: req.user!._id },
      { $set: { coverImages: [] } },
    );
    if (!user) throw new BadRequestException("Failed to delete cover images.");

    await deleteFiles({ keys }).catch(() => null);

    return successResponse({ res });
  };

  // dashboard
  getDashboard = async (req: Request, res: Response) => {
    const result = await Promise.allSettled([
      this._userModel.find({ paranoid: false }),
      this._postModel.find({ paranoid: false }, undefined, {
        populate: "createdBy",
        match: {
          paranoid: false,
        },
      }),
      this._chatModel.find(
        { paranoid: false },
        undefined,
        { populate: [{ path: "participants", select: "fName lName username profileImage" }] },
      ),
    ]);

    return successResponse({
      res,
      data: { result },
    });
  };

  // change role
  changeRole = async (req: Request, res: Response) => {
    const { userId }: ChangeRoleParamsDto =
      req.params as unknown as ChangeRoleParamsDto;
    const { role }: ChangeRoleBodyDto =
      req.body as unknown as ChangeRoleBodyDto;
    const denyedRoles = [RoleEnum.SUPER_ADMIN, role];
    if (req.user?.role === RoleEnum.ADMIN) denyedRoles.push(RoleEnum.ADMIN);
    const user = await this._userModel.findOneAndUpdate(
      {
        _id: userId as unknown as Types.ObjectId,
        role: { $nin: denyedRoles },
      },
      { role },
    );

    if (!user) throw new BadRequestException("Fail to change role.");
    return successResponse({ res });
  };

  // send request
  sendRequest = async (req: Request, res: Response) => {
    const { userId }: SendRequsetDto = req.params as unknown as SendRequsetDto;
    const user = await this._userModel.findOne({
      _id: userId as unknown as Types.ObjectId,
      friends: { $ne: req.user?._id as unknown as Types.ObjectId },
    });
    if (!user) throw new NotFoundException("Fail to find matching user.");
    const isRequsetExist = await this._friendRequestModel.findOne({
      createdBy: req.user?._id || (userId as unknown as Types.ObjectId),
      sendTo: userId || (req.user?._id as unknown as Types.ObjectId),
    });
    if (isRequsetExist) throw new ConflictException("Request already sent.");
    const request = await this._friendRequestModel.create({
      createdBy: req.user?._id as unknown as Types.ObjectId,
      sendTo: userId as unknown as Types.ObjectId,
    });
    if (!request) throw new BadRequestException("Fail to send request.");

    io.to(userId.toString()).emit("friendship_updated", {
      userId: req.user?._id.toString(),
      status: "received",
      requestId: request._id.toString(),
    });
    io.to(req?.user?._id.toString() as unknown as string).emit(
      "friendship_updated",
      {
        userId: userId.toString(),
        status: "sent",
        requestId: request._id.toString(),
      },
    );

    // notify the recipient
    await createNotification({
      recipient: request.sendTo as unknown as Types.ObjectId,
      sender: req.user?._id as unknown as Types.ObjectId,
      type: NotificationTypeEnum.FRIEND_REQUEST,
      message: `${req.user?.username ?? "Someone"} sent you a friend request.`,
      refId: request._id as unknown as Types.ObjectId,
      refModel: "FriendRequest",
    });

    return successResponse({ res, statusCode: 201 });
  };

  // accept request
  acceptRequest = async (req: Request, res: Response) => {
    const { requestId }: AcceptRequestDto =
      req.params as unknown as AcceptRequestDto;
    const request = await this._friendRequestModel.findOneAndUpdate(
      {
        _id: requestId as unknown as Types.ObjectId,
        sendTo: req.user?._id as unknown as Types.ObjectId,
        acceptedAt: { $exists: false },
      },
      {
        acceptedAt: new Date(),
      },
    );
    if (!request) throw new NotFoundException("Fail to find matching request.");
    const result = await Promise.all([
      this._userModel.findOneAndUpdate(
        { _id: req.user?._id as unknown as Types.ObjectId },
        {
          $addToSet: {
            friends: request.createdBy as unknown as Types.ObjectId,
          },
        },
      ),
      this._userModel.findOneAndUpdate(
        { _id: request.createdBy as unknown as Types.ObjectId },
        { $addToSet: { friends: req.user?._id as unknown as Types.ObjectId } },
      ),
    ]);
    if (!result) throw new BadRequestException("Fail to accept request.");

    io.to(request.createdBy.toString()).emit("friendship_updated", {
      userId: req.user?._id.toString(),
      status: "friends",
    });
    io.to(req?.user?._id.toString() as unknown as string).emit(
      "friendship_updated",
      { userId: request.createdBy.toString(), status: "friends" },
    );

    // notify the original sender that their request was accepted
    await createNotification({
      recipient: request.createdBy as unknown as Types.ObjectId,
      sender: req.user?._id as unknown as Types.ObjectId,
      type: NotificationTypeEnum.FRIEND_ACCEPTED,
      message: `${req.user?.username ?? "Someone"} accepted your friend request.`,
      refId: request._id as unknown as Types.ObjectId,
      refModel: "FriendRequest",
    });

    return successResponse({ res });
  };

  // cancel request
  cancelRequest = async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };
    const request = await this._friendRequestModel.findOneAndDelete({
      _id: requestId as unknown as Types.ObjectId,
      createdBy: req.user?._id as unknown as Types.ObjectId,
      acceptedAt: { $exists: false },
    });
    if (!request) throw new NotFoundException("Fail to find matching request.");

    io.to(request.sendTo.toString()).emit("friendship_updated", {
      userId: req.user?._id.toString(),
      status: "none",
    });
    io.to(req?.user?._id.toString() as unknown as string).emit(
      "friendship_updated",
      { userId: request.sendTo.toString(), status: "none" },
    );

    return successResponse({ res });
  };

  // reject request
  rejectRequest = async (req: Request, res: Response) => {
    const { requestId }: RejectRequestDto =
      req.params as unknown as RejectRequestDto;
    const request = await this._friendRequestModel.findOneAndDelete({
      _id: requestId as unknown as Types.ObjectId,
      sendTo: req.user?._id as unknown as Types.ObjectId,
      acceptedAt: { $exists: false },
    });
    if (!request) throw new NotFoundException("Fail to find matching request.");

    io.to(request.createdBy.toString()).emit("friendship_updated", {
      userId: req.user?._id.toString(),
      status: "none",
    });
    io.to(req?.user?._id.toString() as unknown as string).emit(
      "friendship_updated",
      { userId: request.createdBy.toString(), status: "none" },
    );

    return successResponse({ res });
  };

  // remove friend
  removeFriend = async (req: Request, res: Response) => {
    const { friendId }: RemoveFriendDto =
      req.params as unknown as RemoveFriendDto;

    // Attempt to delete the request if it exists, but don't fail if it doesn't
    await this._friendRequestModel.findOneAndDelete({
      $or: [
        {
          createdBy: req?.user?._id as unknown as Types.ObjectId,
          sendTo: friendId as unknown as Types.ObjectId,
        },
        {
          createdBy: friendId as unknown as Types.ObjectId,
          sendTo: req?.user?._id as unknown as Types.ObjectId,
        },
      ],
    });

    const result = await Promise.all([
      this._userModel.findOneAndUpdate(
        { _id: req.user?._id as unknown as Types.ObjectId },
        {
          $pull: {
            friends: friendId,
          },
        },
      ),
      this._userModel.findOneAndUpdate(
        { _id: friendId as unknown as Types.ObjectId },
        {
          $pull: {
            friends: req.user?._id as unknown as Types.ObjectId,
          },
        },
      ),
    ]);
    if (!result) throw new BadRequestException("Fail to remove friend.");

    io.to(friendId.toString()).emit("friendship_updated", {
      userId: req.user?._id.toString(),
      status: "none",
    });
    io.to(req?.user?._id.toString() as unknown as string).emit(
      "friendship_updated",
      { userId: friendId.toString(), status: "none" },
    );

    return successResponse({ res });
  };

  checkFriendShipStatus = async (req: Request, res: Response) => {
    const myId = req.user?._id as unknown as Types.ObjectId;
    const otherId = req.params.userId as unknown as Types.ObjectId;

    const isFriend = await this._userModel.findOne({
      _id: myId,
      friends: otherId,
    });

    if (isFriend) {
      return successResponse({ res, data: { status: "friends" } });
    }

    const request = await this._friendRequestModel.findOne({
      $or: [
        { createdBy: myId, sendTo: otherId },
        { createdBy: otherId, sendTo: myId },
      ],
    });

    if (!request) {
      return successResponse({ res, data: { status: "none" } });
    }

    if (request.createdBy.toString() === myId.toString()) {
      return successResponse({
        res,
        data: { status: "sent", requestId: request._id },
      });
    } else {
      return successResponse({
        res,
        data: { status: "received", requestId: request._id },
      });
    }
  };
}

export default new UserService();
