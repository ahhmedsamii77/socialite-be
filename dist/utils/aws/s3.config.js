"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Config = void 0;
exports.uploadFile = uploadFile;
exports.uploadLargeFile = uploadLargeFile;
exports.uploadFiles = uploadFiles;
exports.createPresignedUrl = createPresignedUrl;
exports.getFile = getFile;
exports.createGetPresignedUrl = createGetPresignedUrl;
exports.deleteFile = deleteFile;
exports.deleteFiles = deleteFiles;
exports.listFiles = listFiles;
exports.deleteFolderByPrefix = deleteFolderByPrefix;
const client_s3_1 = require("@aws-sdk/client-s3");
const types_1 = require("../types/types");
const node_fs_1 = require("node:fs");
const res_error_1 = require("../res/res.error");
const uuid_1 = require("uuid");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Config = () => {
    return new client_s3_1.S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
};
exports.s3Config = s3Config;
async function uploadFile({ Bucket = process.env.S3_Bucket_NAME, path = "general", file, ACL = "private", storageApproach = types_1.StorageApproachEnum.MEMORY, }) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        Key: `${process.env.APP_NAME}/${path}/${(0, uuid_1.v4)()}_${file.originalname}`,
        Body: storageApproach === types_1.StorageApproachEnum.MEMORY
            ? file.buffer
            : (0, node_fs_1.createReadStream)(file.path),
        ContentType: file.mimetype,
        ACL,
    });
    await (0, exports.s3Config)().send(command);
    if (!command.input?.Key) {
        throw new res_error_1.BadRequestException("Fail to upload", { file });
    }
    return command.input.Key;
}
async function uploadLargeFile({ Bucket = process.env.S3_Bucket_NAME, path = "general", file, ACL = "private", storageApproach = types_1.StorageApproachEnum.DISK, }) {
    const upload = new lib_storage_1.Upload({
        client: (0, exports.s3Config)(),
        params: {
            Bucket,
            Key: `${process.env.APP_NAME}/${path}/${(0, uuid_1.v4)()}_${file.originalname}`,
            Body: storageApproach === types_1.StorageApproachEnum.MEMORY
                ? file.buffer
                : (0, node_fs_1.createReadStream)(file.path),
            ContentType: file.mimetype,
            ACL,
        },
    });
    const { Key } = await upload.done();
    return Key;
}
async function uploadFiles({ files, storageApproach = types_1.StorageApproachEnum.MEMORY, useLarge = false, path = "general", }) {
    let urls;
    if (useLarge) {
        urls = await Promise.all(files.map((file) => uploadLargeFile({ file, storageApproach, path })));
    }
    else {
        urls = await Promise.all(files.map((file) => uploadFile({ file, storageApproach, path })));
    }
    return urls;
}
async function createPresignedUrl({ Bucket = process.env.S3_Bucket_NAME, path = "general", ACL = "private", ContentType, originalname, expiresIn = Number(process.env.S3_BUCKET_URL_EXPIRE_IN_SECONDS), }) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        Key: `${process.env.APP_NAME}/${path}/${(0, uuid_1.v4)()}_pre_${originalname}`,
        ContentType,
        ACL,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Config)(), command, { expiresIn });
    return {
        url,
        key: command.input?.Key,
    };
}
async function getFile({ Bucket = process.env.S3_Bucket_NAME, Key, }) {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key,
    });
    return await (0, exports.s3Config)().send(command);
}
async function createGetPresignedUrl({ Bucket = process.env.S3_Bucket_NAME, Key, downloadName, download = "false", expiresIn = Number(process.env.S3_BUCKET_URL_EXPIRE_IN_SECONDS), }) {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key,
        ResponseContentDisposition: download === "true"
            ? `attachment; filename="${downloadName || Key.split("/").pop()}"`
            : undefined,
    });
    return await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Config)(), command, { expiresIn });
}
async function deleteFile({ Bucket = process.env.S3_Bucket_NAME, Key, }) {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket,
        Key,
    });
    return await (0, exports.s3Config)().send(command);
}
async function deleteFiles({ Bucket = process.env.S3_Bucket_NAME, keys, Quiet = false, }) {
    const command = new client_s3_1.DeleteObjectsCommand({
        Bucket,
        Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet,
        },
    });
    return await (0, exports.s3Config)().send(command);
}
async function listFiles({ Bucket = process.env.S3_Bucket_NAME, path, }) {
    const command = new client_s3_1.ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APP_NAME}/${path}`,
    });
    return await (0, exports.s3Config)().send(command);
}
async function deleteFolderByPrefix({ Bucket = process.env.S3_Bucket_NAME, path, }) {
    const command = new client_s3_1.ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APP_NAME}/${path}`,
    });
    const objectList = await (0, exports.s3Config)().send(command);
    if (!objectList.Contents?.length)
        return;
    const keys = objectList.Contents?.map((item) => item.Key) || [];
    await deleteFiles({ keys: keys });
}
