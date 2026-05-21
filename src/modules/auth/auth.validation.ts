import { z } from "zod";
import { generalRules } from "../../utils/generalRules";
import { GenderEnum } from "../../utils/types/types";

export const signUpSchema = {
  body: z
    .strictObject({
      username: generalRules.fullName,
      email: generalRules.email,
      password: generalRules.password,
      confirmPassword: generalRules.password,
      phone: generalRules.phone.optional(),
      address: z
        .string()
        .min(3, { error: "Address must be at least 3 characters" })
        .max(20, { error: "Address must be at most 20 characters" })
        .optional(),
      gender: z.enum(GenderEnum, { error: "Invalid gender" }).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
};

export const reSendOtpSchema = {
  body: z.strictObject({
    email: generalRules.email,
  }),
};

export const confirmEmailSchema = {
  body: z.strictObject({
    email: generalRules.email,
    otp: z.string().length(6, { error: "OTP must be 6 characters" }),
  }),
};

export const signinSchema = {
  body: z.strictObject({
    email: generalRules.email,
    password: generalRules.password,
  }),
};

export const gmailSchema = {
  body: z.strictObject({
    idToken: z.string(),
  }),
};

export const forgetPasswordSchema = {
  body: z.strictObject({
    email: generalRules.email,
  }),
};

export const verifyResetPasswordOtpSchema = {
  body: z.strictObject({
    email: generalRules.email,
    otp: z.string().length(6, { error: "OTP must be 6 characters" }),
  }),
};

export const resetPasswordSchema = {
  body: z.strictObject({
    email: generalRules.email,
    password: generalRules.password,
    confirmPassword: generalRules.password,
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
};


