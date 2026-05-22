"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Event = void 0;
const node_events_1 = require("node:events");
const s3_config_1 = require("../aws/s3.config");
const repositories_1 = require("../../DB/repositories");
const user_model_1 = require("../../DB/models/user.model");
exports.s3Event = new node_events_1.EventEmitter();
exports.s3Event.on("trackUploadProfileImage", (data) => {
    const { key, userId, oldKey, expireIn, } = data;
    const _userModel = new repositories_1.UserRepository(user_model_1.userModel);
    setTimeout(async () => {
        try {
            await (0, s3_config_1.getFile)({
                Key: key,
            });
            if (oldKey) {
                await (0, s3_config_1.deleteFile)({ Key: oldKey });
                await _userModel.findOneAndUpdate({ _id: userId }, { $unset: { tempProfileImage: "" } });
            }
        }
        catch (error) {
            if (error.Code === "NoSuchKey") {
                if (oldKey) {
                    await _userModel.findOneAndUpdate({ _id: userId }, { profileImage: oldKey, $unset: { tempProfileImage: "" } });
                }
                else {
                    await _userModel.findOneAndUpdate({ _id: userId }, { $unset: { profileImage: "", tempProfileImage: "" } });
                }
            }
        }
    }, expireIn || Number(process.env.S3_BUCKET_URL_EXPIRE_IN_SECONDS));
});
