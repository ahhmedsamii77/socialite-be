"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types/types");
const repositories_1 = require("../../DB/repositories");
const revokeToken_model_1 = require("../../DB/models/revokeToken.model");
const security_1 = require("../../utils/security");
const res_error_1 = require("../../utils/res/res.error");
const user_model_1 = require("../../DB/models/user.model");
const mongoose_1 = require("mongoose");
const auth_service_1 = __importDefault(require("../auth/auth.service"));
const s3_config_1 = require("../../utils/aws/s3.config");
const res_1 = require("../../utils/res");
const post_model_1 = require("../../DB/models/post.model");
const chat_model_1 = require("../../DB/models/chat.model");
const friendRequest_model_1 = require("../../DB/models/friendRequest.model");
const gateway_1 = require("../gateway");
const notification_service_1 = require("../notification/notification.service");
class UserService {
    _revokeTokenModel = new repositories_1.RevokeTokenRepository(revokeToken_model_1.revokeTokenModel);
    _userModel = new repositories_1.UserRepository(user_model_1.userModel);
    _postModel = new repositories_1.PostRepository(post_model_1.postModel);
    _chatModel = new repositories_1.ChatRepository(chat_model_1.chatModel);
    _friendRequestModel = new repositories_1.FriendRequestRepository(friendRequest_model_1.friendRequestModel);
    constructor() { }
    getProfile = async (req, res) => {
        const user = await this._userModel.findOne({ _id: req.user._id }, undefined, {
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
        });
        if (user?.phone) {
            user.phone = await (0, security_1.decrypt)(user.phone, process.env.PHONE_KEY);
        }
        return (0, res_1.successResponse)({
            res,
            data: {
                user: user,
            },
        });
    };
    logOut = async (req, res) => {
        const { flag } = req.body;
        if (flag === types_1.FlagTypeEnum.ALL) {
            req.user.changeCredentialsTime = new Date();
            req.user.__v += 1;
            await req.user.save();
            return res.status(200).json({
                message: "Done",
            });
        }
        const revokeToken = this._revokeTokenModel.create({
            userId: req.user._id,
            jti: req?.decoded.jti,
            expireIn: new Date(req?.decoded.exp * 1000),
        });
        if (!revokeToken)
            throw new res_error_1.BadRequestException("Failed to revoke token");
        return (0, res_1.successResponse)({ res, statusCode: 201 });
    };
    refreshToken = async (req, res) => {
        const revokeToken = await this._revokeTokenModel.create({
            userId: req.user._id,
            jti: req?.decoded.jti,
            expireIn: new Date(req?.decoded.exp * 1000),
        });
        if (!revokeToken)
            throw new res_error_1.BadRequestException("Failed to revoke token");
        const { access_token, refresh_token } = await (0, security_1.createLoginCredentials)(req.user);
        return (0, res_1.successResponse)({
            res,
            data: {
                credentials: {
                    access_token,
                    refresh_token,
                },
            },
        });
    };
    updatePassword = async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        if (!(await (0, security_1.compareHash)(currentPassword, req?.user?.password))) {
            throw new res_error_1.BadRequestException("Current password is incorrect");
        }
        req.user.password = newPassword;
        req.user.changeCredentialsTime = new Date();
        req.user.__v += 1;
        await req.user.save();
        return (0, res_1.successResponse)({ res });
    };
    shareProfile = async (req, res) => {
        const { userId } = req.params;
        const user = await this._userModel.findOne({
            _id: userId,
            confirmedAt: { $exists: true },
        }, undefined, {
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
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching account.");
        return (0, res_1.successResponse)({ res, data: { user } });
    };
    getAllUser = async (req, res) => {
        const { search, users: usersIds } = req.query;
        const filter = {
            confirmedAt: { $exists: true },
            _id: { $ne: req.user._id },
        };
        if (usersIds?.length) {
            filter["_id"]["$in"] = usersIds
                .split(",")
                .map((id) => new mongoose_1.Types.ObjectId(id));
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
        return (0, res_1.successResponse)({ res, data: { users } });
    };
    getFriends = async (req, res) => {
        const me = await this._userModel.findOne({ _id: req.user._id }, undefined, {
            populate: [{
                    path: "friends",
                    select: "fName lName username profileImage",
                }],
        });
        const friends = (me?.friends ?? []);
        return (0, res_1.successResponse)({ res, data: { friends } });
    };
    getIncomingRequests = async (req, res) => {
        const requests = await this._friendRequestModel.find({ sendTo: req.user._id, acceptedAt: { $exists: false } }, undefined, {
            populate: [
                {
                    path: "createdBy",
                    select: "fName lName username profileImage address friends",
                },
            ],
        });
        const users = requests
            .map((r) => r.toObject())
            .filter((r) => r.createdBy)
            .map((r) => ({
            ...r.createdBy,
            requestId: r._id,
        }));
        return (0, res_1.successResponse)({ res, data: { users } });
    };
    getOutgoingRequests = async (req, res) => {
        const requests = await this._friendRequestModel.find({ createdBy: req.user._id, acceptedAt: { $exists: false } }, undefined, {
            populate: [
                {
                    path: "sendTo",
                    select: "fName lName username profileImage address friends",
                },
            ],
        });
        const users = requests
            .map((r) => r.toObject())
            .filter((r) => r.sendTo)
            .map((r) => ({
            ...r.sendTo,
            requestId: r._id,
        }));
        return (0, res_1.successResponse)({ res, data: { users } });
    };
    getSuggestions = async (req, res) => {
        const currentUser = await this._userModel.findById(req.user._id, { friends: 1 });
        const myFriends = (currentUser?.friends ||
            []);
        const pendingRequests = await this._friendRequestModel.find({
            $or: [{ createdBy: req.user._id }, { sendTo: req.user._id }],
        });
        const pendingIds = pendingRequests.flatMap((r) => [r.createdBy, r.sendTo]);
        const suggestions = await user_model_1.userModel.aggregate([
            {
                $match: {
                    confirmedAt: { $exists: true },
                    _id: {
                        $nin: [
                            new mongoose_1.Types.ObjectId(req.user._id),
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
        return (0, res_1.successResponse)({ res, data: { suggestions } });
    };
    updateProfile = async (req, res) => {
        const { fName, lName, username, phone, address, email, gender, } = req.body;
        if (fName)
            req.user.fName = fName;
        if (lName)
            req.user.lName = lName;
        if (username)
            req.user.username = username;
        if (phone)
            req.user.phone = phone;
        if (address)
            req.user.address = address;
        if (gender)
            req.user.gender = gender;
        let isEmailChanged = false;
        if (email) {
            if (await this._userModel.findOne({
                email,
                _id: { $ne: req.user._id },
            })) {
                throw new res_error_1.BadRequestException("Email is already in use");
            }
            req.user.email = email;
            req.user.confirmedAt = undefined;
            req.user.changeCredentialsTime = new Date();
            isEmailChanged = true;
        }
        req.user.__v += 1;
        await req.user.save();
        if (isEmailChanged) {
            await auth_service_1.default.sendOtp(req.user._id, types_1.OtpTypeEnum.CONFIRM_EMAIL);
        }
        return (0, res_1.successResponse)({
            res,
            data: { user: req.user },
        });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params;
        if (userId && req.user.role !== types_1.RoleEnum.ADMIN)
            throw new res_error_1.UnauthorizedException("Not authorized account.");
        const user = await this._userModel.findOneAndUpdate({
            _id: userId || req.user._id,
            deletedAt: { $exists: false },
            paranoid: false,
        }, {
            deletedAt: new Date(),
            deletedBy: req.user._id,
            changeCredentialsTime: new Date(),
            $unset: { reStoredAt: "", reStoredBy: "" },
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching account.");
        return (0, res_1.successResponse)({ res });
    };
    reStoreAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this._userModel.findOneAndUpdate({
            _id: userId,
            deletedAt: { $exists: true },
            deletedBy: { $ne: userId },
            paranoid: false,
        }, {
            $unset: { deletedAt: "", deletedBy: "" },
            reStoredAt: new Date(),
            reStoredBy: req.user._id,
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching account.");
        return (0, res_1.successResponse)({ res });
    };
    DeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this._userModel.findOneAndDelete({
            _id: userId,
            deletedAt: { $exists: true },
            paranoid: false,
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching account.");
        if (user?.profileImage || user?.coverImages?.length) {
            await (0, s3_config_1.deleteFolderByPrefix)({ path: `user/${user._id}` }).catch(() => null);
        }
        return (0, res_1.successResponse)({ res });
    };
    uploadProfileImage = async (req, res) => {
        const file = req.file;
        if (!file)
            throw new res_error_1.BadRequestException("No image file provided.");
        const key = await (0, s3_config_1.uploadFile)({
            file,
            path: `user/${req.user._id}/profileImage`,
        });
        if (!key)
            throw new res_error_1.BadRequestException("Fail to upload profile image.");
        const oldKey = req.user.profileImage;
        const user = await this._userModel.findOneAndUpdate({ _id: req.user._id }, { profileImage: key });
        if (!user)
            throw new res_error_1.BadRequestException("Fail to update profile image.");
        if (oldKey) {
            await (0, s3_config_1.deleteFile)({ Key: oldKey }).catch(() => null);
        }
        return (0, res_1.successResponse)({
            res,
            data: { key },
        });
    };
    uploadCoverImages = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            files: req.files,
            path: `user/${req.user._id}/coverImages`,
        });
        if (!urls) {
            throw new res_error_1.BadRequestException("Fail to upload cover images.");
        }
        const user = await this._userModel.findOneAndUpdate({ _id: req.user._id }, { coverImages: urls });
        if (!user) {
            if (req.user?.coverImages?.length) {
                await (0, s3_config_1.deleteFiles)({
                    keys: urls,
                });
            }
            throw new res_error_1.BadRequestException("Fail to update cover images.");
        }
        if (req.user?.coverImages?.length) {
            await (0, s3_config_1.deleteFiles)({
                keys: req.user?.coverImages,
            });
        }
        return (0, res_1.successResponse)({
            res,
            data: { urls: urls },
        });
    };
    deleteProfileImage = async (req, res) => {
        const oldKey = req.user.profileImage;
        if (!oldKey)
            throw new res_error_1.BadRequestException("No profile image to delete.");
        const user = await this._userModel.findOneAndUpdate({ _id: req.user._id }, { $set: { profileImage: null } }, { runValidators: false });
        if (!user)
            throw new res_error_1.BadRequestException("Failed to delete profile image.");
        await (0, s3_config_1.deleteFile)({ Key: oldKey }).catch(() => null);
        return (0, res_1.successResponse)({ res });
    };
    deleteCoverImages = async (req, res) => {
        const keys = req.user.coverImages;
        if (!keys?.length)
            throw new res_error_1.BadRequestException("No cover images to delete.");
        const user = await this._userModel.findOneAndUpdate({ _id: req.user._id }, { $set: { coverImages: [] } });
        if (!user)
            throw new res_error_1.BadRequestException("Failed to delete cover images.");
        await (0, s3_config_1.deleteFiles)({ keys }).catch(() => null);
        return (0, res_1.successResponse)({ res });
    };
    getDashboard = async (req, res) => {
        const result = await Promise.allSettled([
            this._userModel.find({ paranoid: false }),
            this._postModel.find({ paranoid: false }, undefined, {
                populate: "createdBy",
                match: {
                    paranoid: false,
                },
            }),
            this._chatModel.find({ paranoid: false }, undefined, { populate: [{ path: "participants", select: "fName lName username profileImage" }] }),
        ]);
        return (0, res_1.successResponse)({
            res,
            data: { result },
        });
    };
    changeRole = async (req, res) => {
        const { userId } = req.params;
        const { role } = req.body;
        const denyedRoles = [types_1.RoleEnum.SUPER_ADMIN, role];
        if (req.user?.role === types_1.RoleEnum.ADMIN)
            denyedRoles.push(types_1.RoleEnum.ADMIN);
        const user = await this._userModel.findOneAndUpdate({
            _id: userId,
            role: { $nin: denyedRoles },
        }, { role });
        if (!user)
            throw new res_error_1.BadRequestException("Fail to change role.");
        return (0, res_1.successResponse)({ res });
    };
    sendRequest = async (req, res) => {
        const { userId } = req.params;
        const user = await this._userModel.findOne({
            _id: userId,
            friends: { $ne: req.user?._id },
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching user.");
        const isRequsetExist = await this._friendRequestModel.findOne({
            createdBy: req.user?._id || userId,
            sendTo: userId || req.user?._id,
        });
        if (isRequsetExist)
            throw new res_error_1.ConflictException("Request already sent.");
        const request = await this._friendRequestModel.create({
            createdBy: req.user?._id,
            sendTo: userId,
        });
        if (!request)
            throw new res_error_1.BadRequestException("Fail to send request.");
        gateway_1.io.to(userId.toString()).emit("friendship_updated", {
            userId: req.user?._id.toString(),
            status: "received",
            requestId: request._id.toString(),
        });
        gateway_1.io.to(req?.user?._id.toString()).emit("friendship_updated", {
            userId: userId.toString(),
            status: "sent",
            requestId: request._id.toString(),
        });
        await (0, notification_service_1.createNotification)({
            recipient: request.sendTo,
            sender: req.user?._id,
            type: notification_service_1.NotificationTypeEnum.FRIEND_REQUEST,
            message: `${req.user?.username ?? "Someone"} sent you a friend request.`,
            refId: request._id,
            refModel: "FriendRequest",
        });
        return (0, res_1.successResponse)({ res, statusCode: 201 });
    };
    acceptRequest = async (req, res) => {
        const { requestId } = req.params;
        const request = await this._friendRequestModel.findOneAndUpdate({
            _id: requestId,
            sendTo: req.user?._id,
            acceptedAt: { $exists: false },
        }, {
            acceptedAt: new Date(),
        });
        if (!request)
            throw new res_error_1.NotFoundException("Fail to find matching request.");
        const result = await Promise.all([
            this._userModel.findOneAndUpdate({ _id: req.user?._id }, {
                $addToSet: {
                    friends: request.createdBy,
                },
            }),
            this._userModel.findOneAndUpdate({ _id: request.createdBy }, { $addToSet: { friends: req.user?._id } }),
        ]);
        if (!result)
            throw new res_error_1.BadRequestException("Fail to accept request.");
        gateway_1.io.to(request.createdBy.toString()).emit("friendship_updated", {
            userId: req.user?._id.toString(),
            status: "friends",
        });
        gateway_1.io.to(req?.user?._id.toString()).emit("friendship_updated", { userId: request.createdBy.toString(), status: "friends" });
        await (0, notification_service_1.createNotification)({
            recipient: request.createdBy,
            sender: req.user?._id,
            type: notification_service_1.NotificationTypeEnum.FRIEND_ACCEPTED,
            message: `${req.user?.username ?? "Someone"} accepted your friend request.`,
            refId: request._id,
            refModel: "FriendRequest",
        });
        return (0, res_1.successResponse)({ res });
    };
    cancelRequest = async (req, res) => {
        const { requestId } = req.params;
        const request = await this._friendRequestModel.findOneAndDelete({
            _id: requestId,
            createdBy: req.user?._id,
            acceptedAt: { $exists: false },
        });
        if (!request)
            throw new res_error_1.NotFoundException("Fail to find matching request.");
        gateway_1.io.to(request.sendTo.toString()).emit("friendship_updated", {
            userId: req.user?._id.toString(),
            status: "none",
        });
        gateway_1.io.to(req?.user?._id.toString()).emit("friendship_updated", { userId: request.sendTo.toString(), status: "none" });
        return (0, res_1.successResponse)({ res });
    };
    rejectRequest = async (req, res) => {
        const { requestId } = req.params;
        const request = await this._friendRequestModel.findOneAndDelete({
            _id: requestId,
            sendTo: req.user?._id,
            acceptedAt: { $exists: false },
        });
        if (!request)
            throw new res_error_1.NotFoundException("Fail to find matching request.");
        gateway_1.io.to(request.createdBy.toString()).emit("friendship_updated", {
            userId: req.user?._id.toString(),
            status: "none",
        });
        gateway_1.io.to(req?.user?._id.toString()).emit("friendship_updated", { userId: request.createdBy.toString(), status: "none" });
        return (0, res_1.successResponse)({ res });
    };
    removeFriend = async (req, res) => {
        const { friendId } = req.params;
        await this._friendRequestModel.findOneAndDelete({
            $or: [
                {
                    createdBy: req?.user?._id,
                    sendTo: friendId,
                },
                {
                    createdBy: friendId,
                    sendTo: req?.user?._id,
                },
            ],
        });
        const result = await Promise.all([
            this._userModel.findOneAndUpdate({ _id: req.user?._id }, {
                $pull: {
                    friends: friendId,
                },
            }),
            this._userModel.findOneAndUpdate({ _id: friendId }, {
                $pull: {
                    friends: req.user?._id,
                },
            }),
        ]);
        if (!result)
            throw new res_error_1.BadRequestException("Fail to remove friend.");
        gateway_1.io.to(friendId.toString()).emit("friendship_updated", {
            userId: req.user?._id.toString(),
            status: "none",
        });
        gateway_1.io.to(req?.user?._id.toString()).emit("friendship_updated", { userId: friendId.toString(), status: "none" });
        return (0, res_1.successResponse)({ res });
    };
    checkFriendShipStatus = async (req, res) => {
        const myId = req.user?._id;
        const otherId = req.params.userId;
        const isFriend = await this._userModel.findOne({
            _id: myId,
            friends: otherId,
        });
        if (isFriend) {
            return (0, res_1.successResponse)({ res, data: { status: "friends" } });
        }
        const request = await this._friendRequestModel.findOne({
            $or: [
                { createdBy: myId, sendTo: otherId },
                { createdBy: otherId, sendTo: myId },
            ],
        });
        if (!request) {
            return (0, res_1.successResponse)({ res, data: { status: "none" } });
        }
        if (request.createdBy.toString() === myId.toString()) {
            return (0, res_1.successResponse)({
                res,
                data: { status: "sent", requestId: request._id },
            });
        }
        else {
            return (0, res_1.successResponse)({
                res,
                data: { status: "received", requestId: request._id },
            });
        }
    };
}
exports.default = new UserService();
