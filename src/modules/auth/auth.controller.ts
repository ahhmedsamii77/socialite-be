import { Router } from "express";
import { validation } from "../../middleware";
import AS from "./auth.service";
import * as AV from "./auth.validation";
export const authRouter = Router();

// signup
authRouter.post("/signup", validation(AV.signUpSchema), AS.signUp);

// resend otp
authRouter.post("/resend-otp", validation(AV.reSendOtpSchema), AS.reSendOtp);

// confirm email
authRouter.patch(
  "/confirm-email",
  validation(AV.confirmEmailSchema),
  AS.confirmEmail,
);

// login
authRouter.post("/login", validation(AV.signinSchema), AS.logIn);

// signup-gmail
authRouter.post(
  "/signup-gmail",
  validation(AV.gmailSchema),
  AS.signupWithGmail,
);

// login-gmail
authRouter.post("/login-gmail", validation(AV.gmailSchema), AS.logInWithGmail);

// send otp for reset password
authRouter.post(
  "/send-reset-password",
  validation(AV.forgetPasswordSchema),
  AS.sendResetPasswordOtp,
);

// verify reset password otp
authRouter.post(
  "/verify-reset-password",
  validation(AV.verifyResetPasswordOtpSchema),
  AS.verifyResetPasswordOtp,
);


// reset password
authRouter.patch(
  "/reset-password",
  validation(AV.resetPasswordSchema),
  AS.resetPassword,
);