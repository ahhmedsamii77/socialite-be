"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userModel = exports.userSchema = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../../utils/types/types");
const security_1 = require("../../utils/security");
const repositories_1 = require("../repositories");
const post_model_1 = require("./post.model");
exports.userSchema = new mongoose_1.Schema({
    fName: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 20,
        lowercase: true,
    },
    lName: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 20,
        lowercase: true,
    },
    email: { type: String, required: true, unique: true },
    confirmedAt: { type: Date },
    password: {
        type: String,
        required: function () {
            return this.provider === types_1.ProviderTypeEnum.SYSTEM ? true : false;
        },
        minLength: 8,
    },
    phone: { type: String },
    address: { type: String },
    gender: {
        type: String,
        enum: types_1.GenderEnum,
        default: types_1.GenderEnum.MALE,
        lowercase: true,
    },
    role: {
        type: String,
        enum: types_1.RoleEnum,
        default: types_1.RoleEnum.USER,
        lowercase: true,
    },
    friends: { type: [mongoose_1.Schema.Types.ObjectId], ref: "User" },
    profileImage: { type: String },
    tempProfileImage: { type: String },
    coverImages: { type: [String] },
    changeCredentialsTime: { type: Date },
    savedPosts: { type: [mongoose_1.Schema.Types.ObjectId], ref: "Post" },
    provider: {
        type: String,
        enum: types_1.ProviderTypeEnum,
        default: types_1.ProviderTypeEnum.SYSTEM,
    },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reStoredAt: { type: Date },
    reStoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
});
exports.userSchema.virtual("posts", {
    ref: "Post",
    localField: "_id",
    foreignField: "createdBy",
});
exports.userSchema
    .virtual("username")
    .set(function (value) {
    const [fName, lName] = value.split(" ") || [];
    this.set({ fName, lName });
})
    .get(function () {
    return this.fName + " " + this.lName;
});
exports.userSchema.virtual("otp", {
    ref: "Otp",
    localField: "_id",
    foreignField: "userId",
});
exports.userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        this.password = await (0, security_1.generateHash)(this.password);
    }
    if (this?.phone && this.isModified("phone")) {
        this.phone = await (0, security_1.encrypt)(this.phone, process.env.PHONE_KEY);
    }
});
exports.userSchema.pre(/^find/, async function () {
    const query = this.getQuery();
    const { paranoid, ...rest } = query;
    if (paranoid === false) {
        this.setQuery({ ...rest });
    }
    else {
        this.setQuery({
            ...query,
            deletedAt: { $exists: false },
        });
    }
});
exports.userSchema.post(["findOneAndDelete", "deleteOne"], async function () {
    const query = this.getQuery();
    const _postModel = new repositories_1.PostRepository(post_model_1.postModel);
    await _postModel.findPostsByCursorAndDelete({
        createdBy: query._id,
        paranoid: false,
    });
});
exports.userSchema.post(["findOneAndUpdate", "updateOne", "updateMany"], async function (res) {
    if (!res)
        return;
    if (res.modifiedCount !== undefined && !res.modifiedCount)
        return;
    const update = this.getUpdate();
    const deletedAt = update?.deletedAt ?? update?.$set?.deletedAt;
    const deletedBy = update?.deletedBy ?? update?.$set?.deletedBy;
    const reStoredAt = update?.reStoredAt ?? update?.$set?.reStoredAt;
    const reStoredBy = update?.reStoredBy ?? update?.$set?.reStoredBy;
    if (!deletedAt && !reStoredAt)
        return;
    const query = this.getQuery();
    const userId = query._id;
    if (!userId)
        return;
    const postModel = mongoose_1.models.Post;
    const commentModel = mongoose_1.models.Comment;
    if (!postModel || !commentModel)
        return;
    if (deletedAt) {
        await postModel.updateMany({ createdBy: userId, deletedAt: { $exists: false } }, {
            $set: { deletedAt, deletedBy },
            $unset: { reStoredAt: "", reStoredBy: "" },
        });
        await commentModel.updateMany({ createdBy: userId, deletedAt: { $exists: false } }, {
            $set: { deletedAt, deletedBy },
            $unset: { reStoredAt: "", reStoredBy: "" },
        });
    }
    else if (reStoredAt) {
        await postModel.updateMany({ createdBy: userId, deletedAt: { $exists: true } }, {
            $unset: { deletedAt: "", deletedBy: "" },
            $set: { reStoredAt, reStoredBy },
        });
        await commentModel.updateMany({ createdBy: userId, deletedAt: { $exists: true } }, {
            $unset: { deletedAt: "", deletedBy: "" },
            $set: { reStoredAt, reStoredBy },
        });
    }
});
exports.userModel = mongoose_1.models.User || (0, mongoose_1.model)("User", exports.userSchema);
