import { z } from "zod";
import {
  confirmEmailSchema,
  forgetPasswordSchema,
  gmailSchema,
  reSendOtpSchema,
  resetPasswordSchema,
  signinSchema,
  signUpSchema,
  verifyResetPasswordOtpSchema,
} from "./auth.validation";

export type SignUpDto = z.infer<typeof signUpSchema.body>;
export type ReSendOtpDto = z.infer<typeof reSendOtpSchema.body>;
export type ConfirmEmailDto = z.infer<typeof confirmEmailSchema.body>;
export type SignInDto = z.infer<typeof signinSchema.body>;
export type GmailDto = z.infer<typeof gmailSchema.body>;
export type ForgetPasswordDto = z.infer<typeof forgetPasswordSchema.body>;
export type VerifyResetPasswordOtpDto = z.infer<
  typeof verifyResetPasswordOtpSchema.body
>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema.body>;