import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { StorageApproachEnum } from "../types/types";
import { createReadStream } from "node:fs";
import { BadRequestException } from "../res/res.error";
import { v4 as uuid } from "uuid";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// configure aws
export const s3Config = () => {
  return new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
};

// upload file
export async function uploadFile({
  Bucket = process.env.S3_Bucket_NAME,
  path = "general",
  file,
  ACL = "private",
  storageApproach = StorageApproachEnum.MEMORY,
}: {
  Bucket?: string;
  path?: string;
  file: Express.Multer.File;
  ACL?: ObjectCannedACL;
  storageApproach?: StorageApproachEnum;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket,
    Key: `${process.env.APP_NAME}/${path}/${uuid()}_${file.originalname}`,
    Body:
      storageApproach === StorageApproachEnum.MEMORY
        ? file.buffer
        : createReadStream(file.path),
    ContentType: file.mimetype,
    ACL,
  });

  await s3Config().send(command);
  if (!command.input?.Key) {
    throw new BadRequestException("Fail to upload", { file });
  }
  return command.input.Key;
}

// upload large file
export async function uploadLargeFile({
  Bucket = process.env.S3_Bucket_NAME,
  path = "general",
  file,
  ACL = "private",
  storageApproach = StorageApproachEnum.DISK,
}: {
  Bucket?: string;
  path?: string;
  file: Express.Multer.File;
  ACL?: ObjectCannedACL;
  storageApproach?: StorageApproachEnum;
}) {
  const upload = new Upload({
    client: s3Config(),
    params: {
      Bucket,
      Key: `${process.env.APP_NAME}/${path}/${uuid()}_${file.originalname}`,
      Body:
        storageApproach === StorageApproachEnum.MEMORY
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype,
      ACL,
    },
  });
  const { Key } = await upload.done();
  return Key;
}

// upload files
export async function uploadFiles({
  files,
  storageApproach = StorageApproachEnum.MEMORY,
  useLarge = false,
  path = "general",
}: {
  files: Express.Multer.File[];
  storageApproach?: StorageApproachEnum;
  useLarge?: boolean;
  path?: string;
}) {
  let urls;
  if (useLarge) {
    urls = await Promise.all(
      files.map((file) => uploadLargeFile({ file, storageApproach, path })),
    );
  } else {
    urls = await Promise.all(
      files.map((file) => uploadFile({ file, storageApproach, path })),
    );
  }
  return urls;
}

// create presigned url
export async function createPresignedUrl({
  Bucket = process.env.S3_Bucket_NAME,
  path = "general",
  ACL = "private",
  ContentType,
  originalname,
  expiresIn = Number(process.env.S3_BUCKET_URL_EXPIRE_IN_SECONDS),
}: {
  Bucket?: string;
  path?: string;
  ACL?: ObjectCannedACL;
  ContentType?: string;
  originalname?: string;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket,
    Key: `${process.env.APP_NAME}/${path}/${uuid()}_pre_${originalname}`,
    ContentType,
    ACL,
  });

  const url = await getSignedUrl(s3Config(), command, { expiresIn });
  return {
    url,
    key: command.input?.Key,
  };
}

// get file
export async function getFile({
  Bucket = process.env.S3_Bucket_NAME,
  Key,
}: {
  Bucket?: string;
  Key: string;
}) {
  const command = new GetObjectCommand({
    Bucket,
    Key,
  });
  return await s3Config().send(command);
}

// create get presigned url
export async function createGetPresignedUrl({
  Bucket = process.env.S3_Bucket_NAME,
  Key,
  downloadName,
  download = "false",
  expiresIn = Number(process.env.S3_BUCKET_URL_EXPIRE_IN_SECONDS),
}: {
  Bucket?: string;
  Key: string;
  downloadName?: string;
  expiresIn?: number;
  download?: string;
}) {
  const command = new GetObjectCommand({
    Bucket,
    Key,
    ResponseContentDisposition:
      download === "true"
        ? `attachment; filename="${downloadName || Key.split("/").pop()}"`
        : undefined,
  });
  return await getSignedUrl(s3Config(), command, { expiresIn });
}

// delete file
export async function deleteFile({
  Bucket = process.env.S3_Bucket_NAME,
  Key,
}: {
  Bucket?: string;
  Key: string;
}) {
  const command = new DeleteObjectCommand({
    Bucket,
    Key,
  });
  return await s3Config().send(command);
}

// delete files
export async function deleteFiles({
  Bucket = process.env.S3_Bucket_NAME,
  keys,
  Quiet = false,
}: {
  Bucket?: string;
  keys: string[];
  Quiet?: boolean;
}) {
  const command = new DeleteObjectsCommand({
    Bucket,
    Delete: {
      Objects: keys.map((key) => ({ Key: key })),
      Quiet,
    },
  });
  return await s3Config().send(command);
}

// list files
export async function listFiles({
  Bucket = process.env.S3_Bucket_NAME,
  path,
}: {
  Bucket?: string;
  path: string;
}) {
  const command = new ListObjectsV2Command({
    Bucket,
    Prefix: `${process.env.APP_NAME}/${path}`,
  });
  return await s3Config().send(command);
}

// delete folder by prefix
export async function deleteFolderByPrefix({
  Bucket = process.env.S3_Bucket_NAME,
  path,
}: {
  Bucket?: string;
  path: string;
}) {
  const command = new ListObjectsV2Command({
    Bucket,
    Prefix: `${process.env.APP_NAME}/${path}`,
  });
  const objectList = await s3Config().send(command);
  // If folder is empty or doesn't exist, nothing to delete — not an error
  if (!objectList.Contents?.length) return;
  const keys = objectList.Contents?.map((item) => item.Key) || [];
  await deleteFiles({ keys: keys as string[] });
}

