import { HydratedDocument, model, models, Query, Schema } from "mongoose";
import {
  GenderEnum,
  ProviderTypeEnum,
  RoleEnum,
  UserType,
} from "../../utils/types/types";
import { encrypt, generateHash } from "../../utils/security";
import { PostRepository } from "../repositories";
import { postModel } from "./post.model";

export const userSchema = new Schema<UserType>(
  {
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
      required: function (this: UserType) {
        return this.provider === ProviderTypeEnum.SYSTEM ? true : false;
      },
      minLength: 8,
    },
    phone: { type: String },
    address: { type: String },
    gender: {
      type: String,
      enum: GenderEnum,
      default: GenderEnum.MALE,
      lowercase: true,
    },
    role: {
      type: String,
      enum: RoleEnum,
      default: RoleEnum.USER,
      lowercase: true,
    },
    friends: { type: [Schema.Types.ObjectId], ref: "User" },
    profileImage: { type: String },
    tempProfileImage: { type: String },
    coverImages: { type: [String] },
    changeCredentialsTime: { type: Date },
    savedPosts: { type: [Schema.Types.ObjectId], ref: "Post" },
    provider: {
      type: String,
      enum: ProviderTypeEnum,
      default: ProviderTypeEnum.SYSTEM,
    },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reStoredAt: { type: Date },
    reStoredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
  },
);

userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "createdBy",
});

userSchema
  .virtual("username")
  .set(function (value: string) {
    const [fName, lName] = value.split(" ") || [];
    this.set({ fName, lName });
  })
  .get(function () {
    return this.fName + " " + this.lName;
  });

userSchema.virtual("otp", {
  ref: "Otp",
  localField: "_id",
  foreignField: "userId",
});

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await generateHash(this.password);
  }
  if (this?.phone && this.isModified("phone")) {
    this.phone = await encrypt(this.phone, process.env.PHONE_KEY!);
  }
});

userSchema.pre<Query<UserType, any>>(/^find/, async function () {
  const query = this.getQuery();
  const { paranoid, ...rest } = query;
  if (paranoid === false) {
    this.setQuery({ ...rest });
  } else {
    this.setQuery({
      ...query,
      deletedAt: { $exists: false },
    });
  }
});

userSchema.post<Query<UserType, any>>(
  ["findOneAndDelete", "deleteOne"],
  async function () {
    const query = this.getQuery();
    const _postModel = new PostRepository(postModel);
    await _postModel.findPostsByCursorAndDelete({
      createdBy: query._id,
      paranoid: false,
    });
  },
);


userSchema.post(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  async function (
    this: Query<any, any>,
    res: any 
  ) {
    if (!res) return;
    if (res.modifiedCount !== undefined && !res.modifiedCount) return;

    const update = this.getUpdate() as Record<string, any>;

    const deletedAt = update?.deletedAt ?? update?.$set?.deletedAt;
    const deletedBy = update?.deletedBy ?? update?.$set?.deletedBy;

    const reStoredAt = update?.reStoredAt ?? update?.$set?.reStoredAt;
    const reStoredBy = update?.reStoredBy ?? update?.$set?.reStoredBy;

    if (!deletedAt && !reStoredAt) return;

    const query = this.getQuery();
    const userId = query._id;
    if (!userId) return;

    const postModel = models.Post;
    const commentModel = models.Comment;

    if (!postModel || !commentModel) return;

    if (deletedAt) {
      await postModel.updateMany(
        { createdBy: userId, deletedAt: { $exists: false } },
        {
          $set: { deletedAt, deletedBy },
          $unset: { reStoredAt: "", reStoredBy: "" },
        }
      );

      await commentModel.updateMany(
        { createdBy: userId, deletedAt: { $exists: false } },
        {
          $set: { deletedAt, deletedBy },
          $unset: { reStoredAt: "", reStoredBy: "" },
        }
      );
    } else if (reStoredAt) {
      await postModel.updateMany(
        { createdBy: userId, deletedAt: { $exists: true } },
        {
          $unset: { deletedAt: "", deletedBy: "" },
          $set: { reStoredAt, reStoredBy },
        }
      );

      await commentModel.updateMany(
        { createdBy: userId, deletedAt: { $exists: true } },
        {
          $unset: { deletedAt: "", deletedBy: "" },
          $set: { reStoredAt, reStoredBy },
        }
      );
    }
  }
);

export type HUserDocument = HydratedDocument<UserType>;

export const userModel = models.User || model<UserType>("User", userSchema);
