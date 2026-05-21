import { EventEmitter } from "node:events";
import { deleteFile, getFile } from "../aws/s3.config";
import { Types } from "mongoose";
import { UserRepository } from "../../DB/repositories";
import { userModel } from "../../DB/models/user.model";

export const s3Event = new EventEmitter();
s3Event.on("trackUploadProfileImage", (data) => {
  const {
    key,
    userId,
    oldKey,
    expireIn,
  }: {
    key: string;
    oldKey: string;
    userId: Types.ObjectId;
    expireIn: number;
  } = data;
  const _userModel = new UserRepository(userModel);
  setTimeout(
    async () => {
      try {
        await getFile({
          Key: key as string,
        });
        if (oldKey) {
          await deleteFile({ Key: oldKey });
          await _userModel.findOneAndUpdate(
            { _id: userId },
            { $unset: { tempProfileImage: "" } },
          );
        }
      } catch (error: any) {
        if (error.Code === "NoSuchKey") {
          if (oldKey) {
            await _userModel.findOneAndUpdate(
              { _id: userId },
              { profileImage: oldKey, $unset: { tempProfileImage: "" } },
            );
          } else {
            await _userModel.findOneAndUpdate(
              { _id: userId },
              { $unset: { profileImage: "", tempProfileImage: "" } },
            );
          }
        }
      }
    },
    expireIn || Number(process.env.S3_BUCKET_URL_EXPIRE_IN_SECONDS),
  );
});
