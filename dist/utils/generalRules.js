"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRules = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
exports.generalRules = {
    _id: zod_1.z.string().refine((value) => mongoose_1.Types.ObjectId.isValid(value), {
        message: "Invalid ObjectId format",
    }),
    fName: zod_1.z
        .string()
        .min(3, { error: "First name must be at least 3 characters" })
        .max(20, { error: "First name must be at most 20 characters" }),
    lName: zod_1.z
        .string()
        .min(3, { error: "Last name must be at least 3 characters" })
        .max(20, { error: "Last name must be at most 20 characters" }),
    fullName: zod_1.z
        .string()
        .min(3, { error: "Full name must be at least 3 characters" })
        .max(20, { error: "Full name must be at most 20 characters" }),
    email: zod_1.z.email({ error: "Invalid email" }),
    password: zod_1.z
        .string()
        .min(8, { error: "Password must be at least 8 characters" })
        .max(20, { error: "Password must be at most 20 characters" }),
    phone: zod_1.z.string().regex(/^(20)?01[0125][0-9]{8}$/, {
        message: "Invalid Egyptian phone number",
    }),
    file: zod_1.z.object({
        fieldname: zod_1.z.string(),
        originalname: zod_1.z.string(),
        encoding: zod_1.z.string(),
        mimetype: zod_1.z.string(),
        size: zod_1.z.number(),
        buffer: zod_1.z.any().optional(),
        path: zod_1.z.string().optional(),
    }),
};
