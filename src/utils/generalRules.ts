import { Types } from "mongoose";
import { z } from "zod";
export const generalRules = {
  _id: z.string().refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid ObjectId format",
  }),
  fName: z
    .string()
    .min(3, { error: "First name must be at least 3 characters" })
    .max(20, { error: "First name must be at most 20 characters" }),
  lName: z
    .string()
    .min(3, { error: "Last name must be at least 3 characters" })
    .max(20, { error: "Last name must be at most 20 characters" }),
  fullName: z
    .string()
    .min(3, { error: "Full name must be at least 3 characters" })
    .max(20, { error: "Full name must be at most 20 characters" }),
  email: z.email({ error: "Invalid email" }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(20, { error: "Password must be at most 20 characters" }),
  phone: z.string().regex(/^(20)?01[0125][0-9]{8}$/, {
    message: "Invalid Egyptian phone number",
  }),
  file: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    size: z.number(),
    buffer: z.any().optional(),
    path: z.string().optional(),
  }),
};
