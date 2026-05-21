import { z } from "zod";
import { FlagTypeEnum, GenderEnum, RoleEnum } from "../../utils/types/types";
import { generalRules } from "../../utils/generalRules";
export const logoutSchema = {
  body: z.strictObject({
    flag: z
      .enum(FlagTypeEnum, { error: "Invalid flag" })
      .default(FlagTypeEnum.SINGLE),
  }),
};

export const updatePasswordSchema = {
  body: z
    .strictObject({
      currentPassword: generalRules.password,
      newPassword: generalRules.password,
      confirmNewPassword: generalRules.password,
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "New passwords do not match",
      path: ["confirmNewPassword"],
    }),
};

export const shareProfileSchema = {
  params: z.strictObject({
    userId: generalRules._id,
  }),
};

export const updateProfileSchema = {
  body: z.strictObject({
    fName: generalRules.fName.optional(),
    lName: generalRules.lName.optional(),
    username: z
      .string()
      .min(3, { error: "Username must be at least 3 characters" })
      .max(20, { error: "Username must be at most 20 characters" })
      .optional(),
    phone: generalRules.phone.optional(),
    address: z
      .string()
      .max(100, { error: "Address must be at most 100 characters" })
      .optional(),
    email: generalRules.email.optional(),
    gender: z.enum(GenderEnum, { error: "Invalid gender" }).optional(),
  }),
};

export const freezeAccountSchema = {
  params: z.strictObject({
    userId: generalRules._id.optional(),
  }),
};

export const reStoreAccountSchema = {
  params: z.strictObject({
    userId: generalRules._id,
  }),
};

export const hardDeleteAccountSchema = {
  params: z.strictObject({
    userId: generalRules._id,
  }),
};


export const changeRoleSchema = {
  params: z.strictObject({
    userId: generalRules._id,
  }),
  body: z.strictObject({
    role: z.enum(RoleEnum, { error: "Invalid role" }),
  }),
};

export const sendRequestSchema = {
  params: z.strictObject({
    userId: generalRules._id,
  }),
};

export const acceptRequestSchema = {
  params: z.strictObject({
    requestId: generalRules._id,
  }),
};

export const rejectRequestSchema = {
  params: z.strictObject({
    requestId: generalRules._id,
  }),
};

export const removeFriendSchema = {
  params: z.strictObject({
    friendId: generalRules._id,
  }),
};

