"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileValidation = void 0;
exports.multerCloud = multerCloud;
const types_1 = require("../utils/types/types");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const node_os_1 = require("node:os");
const res_error_1 = require("../utils/res/res.error");
exports.fileValidation = {
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
function multerCloud({ storageApproach = types_1.StorageApproachEnum.MEMORY, validation = exports.fileValidation.image, maxSize = 5, }) {
    const storage = storageApproach === types_1.StorageApproachEnum.DISK
        ? multer_1.default.diskStorage({
            destination: (0, node_os_1.tmpdir)(),
            filename: (req, file, cb) => {
                cb(null, `${(0, uuid_1.v4)()}-${file.originalname}`);
            },
        })
        : multer_1.default.memoryStorage();
    function fileFilter(req, file, cb) {
        if (validation.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new res_error_1.BadRequestException("validation error", {
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
            }));
        }
    }
    const uploads = (0, multer_1.default)({
        storage,
        fileFilter,
        limits: {
            fileSize: maxSize * 1024 * 1024,
        },
    });
    return uploads;
}
