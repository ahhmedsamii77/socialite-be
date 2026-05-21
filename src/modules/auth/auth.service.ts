import type { Request, Response } from "express";
import {
  ConfirmEmailDto,
  ForgetPasswordDto,
  GmailDto,
  ReSendOtpDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  VerifyResetPasswordOtpDto,
} from "./auth.dto";
import { OtpRepository, UserRepository } from "../../DB/repositories";
import { userModel } from "../../DB/models/user.model";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../utils/res/res.error";
import { OtpModel } from "../../DB/models/otp.model";
import { OtpTypeEnum, ProviderTypeEnum } from "../../utils/types/types";
import { Types } from "mongoose";
import { compareHash, createLoginCredentials } from "../../utils/security";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { successResponse } from "../../utils/res";
import { UserResponseType } from "../../utils/types";

export class AuthService {
  private _userModel = new UserRepository(userModel);
  private _otpModel = new OtpRepository(OtpModel);
  constructor() {}

  // verify id token
  private async verifyIdToken(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID as string,
    });
    const payload = ticket.getPayload() as TokenPayload;
    if (!payload.email_verified) {
      throw new BadRequestException("Email not verified by Google");
    }
    return payload;
  }

  // send otp
  sendOtp = async (
    userId: Types.ObjectId,
    otpType: OtpTypeEnum = OtpTypeEnum.CONFIRM_EMAIL,
  ) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this._otpModel.create({
      code: otp,
      userId,
      type: otpType,
      expireAt: new Date(Date.now() + 1 * 60 * 1000),
    });
  };

  // sign up
  signUp = async (req: Request, res: Response): Promise<Response> => {
    const { username, email, password, phone, address, gender }: SignUpDto =
      req.body;
    const existingUser = await this._userModel.findOne({ email });
    if (existingUser) throw new ConflictException("User already exists");
    const user = await this._userModel.create({
      username: username!,
      email: email!,
      password: password!,
      phone: phone!,
      address: address!,
      gender: gender!,
    });
    if (!user) throw new NotFoundException("Failed to create user");
    await this.sendOtp(user._id);
    return successResponse({ res, statusCode: 201 });
  };

  // resend otp
  reSendOtp = async (req: Request, res: Response): Promise<Response> => {
    const { email }: ReSendOtpDto = req.body;
    const user = await this._userModel.findOne(
      { email, confirmedAt: { $exists: false } },
      undefined,
      {
        populate: {
          path: "otp",
          match: {
            type: OtpTypeEnum.CONFIRM_EMAIL,
            isVerified: { $exists: false },
          },
        },
      },
    );
    if (!user) throw new NotFoundException("Fail to find matching account.");
    if (user?.otp?.length)
      throw new ConflictException(
        `An unexpired OTP already exists. Please check your email or try again later.`,
      );
    await this.sendOtp(user._id);
    return successResponse({ res });
  };

  // confirm email
  confirmEmail = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp }: ConfirmEmailDto = req.body;
    const user = await this._userModel.findOne(
      {
        email,
        confirmedAt: { $exists: false },
      },
      undefined,
      {
        populate: {
          path: "otp",
          match: {
            type: OtpTypeEnum.CONFIRM_EMAIL,
            isVerified: { $exists: false },
          },
        },
      },
    );
    if (!user) throw new NotFoundException("Fail to find matching account.");
    if (
      !(user?.otp?.length && (await compareHash(otp, user?.otp?.[0]?.code!)))
    ) {
      throw new BadRequestException("Invalid OTP or OTP has expired.");
    }
    user.confirmedAt = new Date();
    user.__v += 1;
    await user.save();
    await this._otpModel.deleteMany({
      userId: user._id,
      type: OtpTypeEnum.CONFIRM_EMAIL,
    });
    return successResponse({ res });
  };

  // login
  logIn = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: SignInDto = req.body;
    const user = await this._userModel.findOne({
      email,
    });
    if (!user) throw new NotFoundException("Fail to find matching account.");
    if (!user.confirmedAt)
      throw new BadRequestException(
        "Please confirm your email before logging in.",
      );
    if (user.provider == ProviderTypeEnum.GOOGLE) {
      throw new ConflictException("You cannot login with google account.");
    }
    if (!(await compareHash(password, user.password!))) {
      throw new BadRequestException("Invalid password");
    }
    const { access_token, refresh_token } = await createLoginCredentials(user);
    return successResponse<UserResponseType>({
      res,
      data: { credentials: { access_token, refresh_token }, role: user.role },
    });
  };

  // google sign up
  signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: GmailDto = req.body;
    const { name, email, picture, given_name, family_name }: TokenPayload =
      await this.verifyIdToken(idToken);
    let user = await this._userModel.findOne({ email: email as string });
    if (user) {
      return await this.logInWithGmail(req, res);
    } else {
      const newUser = await this._userModel.create({
        fName: given_name as string,
        lName: family_name as string,
        username: name as string,
        email: email as string,
        confirmedAt: new Date(),
        profileImage: picture as string,
        provider: ProviderTypeEnum.GOOGLE,
      });
      if (!newUser) throw new BadRequestException("Failed to create user.");
      const { access_token, refresh_token } =
        await createLoginCredentials(newUser);
      return successResponse<UserResponseType>({
        res,
        statusCode: 201,
        data: { credentials: { access_token, refresh_token }, role: newUser.role },
      });
    }
  };

  // login with Gmail
  logInWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: GmailDto = req.body;
    const { email }: TokenPayload = await this.verifyIdToken(idToken);
    const user = await this._userModel.findOne({ email: email as string });
    if (!user)
      throw new BadRequestException("Not registered account with this gmail.");
    if (user.provider !== ProviderTypeEnum.GOOGLE) {
      throw new ConflictException(
        `Email is registered with ${user.provider}. Please log in with ${user.provider} or use another email.`,
      );
    }
    const { access_token, refresh_token } = await createLoginCredentials(user);
    return successResponse<UserResponseType>({
      res,
      data: { credentials: { access_token, refresh_token }, role: user.role },
    });
  };

  // send reset password otp
  sendResetPasswordOtp = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const { email }: ForgetPasswordDto = req.body;
    const user = await this._userModel.findOne(
      {
        email,
        provider: ProviderTypeEnum.SYSTEM,
        confirmedAt: { $exists: true },
      },
      undefined,
      {
        populate: {
          path: "otp",
          match: { type: OtpTypeEnum.FORGOT_PASSWORD },
        },
      },
    );
    if (!user)
      throw new NotFoundException("Not matching account with this email.");
    if (user?.otp?.length)
      throw new ConflictException(
        `An unexpired OTP already exists. Please check your email or try again later.`,
      );
    await this.sendOtp(user._id, OtpTypeEnum.FORGOT_PASSWORD);
    return successResponse({ res });
  };

  // verify reset password otp
  verifyResetPasswordOtp = async (req: Request, res: Response) => {
    const { email, otp }: VerifyResetPasswordOtpDto = req.body;
    const user = await this._userModel.findOne(
      {
        email,
        provider: ProviderTypeEnum.SYSTEM,
        confirmedAt: { $exists: true },
      },
      undefined,
      {
        populate: {
          path: "otp",
          match: {
            type: OtpTypeEnum.FORGOT_PASSWORD,
            isVerified: { $exists: false },
          },
        },
      },
    );
    if (!user)
      throw new NotFoundException("Not matching account with this email.");
    if (
      !(user?.otp?.length && (await compareHash(otp, user?.otp?.[0]?.code!)))
    ) {
      throw new BadRequestException("Invalid OTP or OTP has expired");
    }
    await this._otpModel.updateOne(
      {
        userId: user._id,
        type: OtpTypeEnum.FORGOT_PASSWORD,
        isVerified: { $exists: false },
      },
      { $set: { isVerified: true } },
    );
    return successResponse({ res });
  };

  // reset password
  resetPassword = async (req: Request, res: Response) => {
    const { email, password }: ResetPasswordDto = req.body;
    const user = await this._userModel.findOne(
      {
        email,
        provider: ProviderTypeEnum.SYSTEM,
        confirmedAt: { $exists: true },
      },
      undefined,
      {
        populate: {
          path: "otp",
          match: {
            type: OtpTypeEnum.FORGOT_PASSWORD,
            isVerified: { $exists: true },
          },
        },
      },
    );
    if (!user)
      throw new NotFoundException(
        "Not matching account with this email or OTP not verified.",
      );
    if (user?.otp?.length === 0)
      throw new BadRequestException(
        "Please verify OTP before resetting password.",
      );
    user.password = password;
    user.changeCredentialsTime = new Date();
    user.__v += 1;
    await user.save();
    await this._otpModel.deleteMany({
      userId: user._id,
      type: OtpTypeEnum.FORGOT_PASSWORD,
      isVerified: { $exists: true },
    });
    return successResponse({ res });
  };
}

export default new AuthService();
