import type { Request } from "express";
import { StorageApproachEnum } from "../utils/types/types";
import multer, { FileFilterCallback } from "multer";
import { v4 as uuid } from "uuid";
import { tmpdir } from "node:os";
import { BadRequestException } from "../utils/res/res.error";
export const fileValidation = {
  image: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/tif",
    "image/svg+xml",
    "image/avif",
    "image/ico",
  ],
  video: [
    "video/mp4",
    "video/mpeg",
    "video/ogg",
    "video/webm",
    "video/quicktime",
  ],
};
export function multerCloud({
  storageApproach = StorageApproachEnum.MEMORY,
  validation = fileValidation.image ,
  maxSize = 5,
}: {
  storageApproach?: StorageApproachEnum;
  validation?: string[];
  maxSize?: number;
}) {
  const storage =
    storageApproach === StorageApproachEnum.DISK
      ? multer.diskStorage({
          destination: tmpdir(),
          filename: (req, file, cb) => {
            cb(null, `${uuid()}-${file.originalname}`);
          },
        })
      : multer.memoryStorage();
  function fileFilter(
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) {
    if (validation.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException("validation error", {
          validationErrors: [
            {
              key: "file",
              issues: [
                {
                  message: "Invalid file format",
                  path: "file",
                },
              ],
            },
          ],
        }),
      );
    }
  }
  const uploads = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize * 1024 * 1024,
    },
  });
  return uploads;
}
