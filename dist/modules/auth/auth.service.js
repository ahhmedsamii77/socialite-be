"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const repositories_1 = require("../../DB/repositories");
const user_model_1 = require("../../DB/models/user.model");
const res_error_1 = require("../../utils/res/res.error");
const otp_model_1 = require("../../DB/models/otp.model");
const types_1 = require("../../utils/types/types");
const security_1 = require("../../utils/security");
const google_auth_library_1 = require("google-auth-library");
const res_1 = require("../../utils/res");
class AuthService {
    _userModel = new repositories_1.UserRepository(user_model_1.userModel);
    _otpModel = new repositories_1.OtpRepository(otp_model_1.OtpModel);
    constructor() { }
    async verifyIdToken(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload.email_verified) {
            throw new res_error_1.BadRequestException("Email not verified by Google");
        }
        return payload;
    }
    sendOtp = async (userId, otpType = types_1.OtpTypeEnum.CONFIRM_EMAIL) => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await this._otpModel.create({
            code: otp,
            userId,
            type: otpType,
            expireAt: new Date(Date.now() + 1 * 60 * 1000),
        });
    };
    signUp = async (req, res) => {
        const { username, email, password, phone, address, gender } = req.body;
        const existingUser = await this._userModel.findOne({ email });
        if (existingUser)
            throw new res_error_1.ConflictException("User already exists");
        const user = await this._userModel.create({
            username: username,
            email: email,
            password: password,
            phone: phone,
            address: address,
            gender: gender,
        });
        if (!user)
            throw new res_error_1.NotFoundException("Failed to create user");
        await this.sendOtp(user._id);
        return (0, res_1.successResponse)({ res, statusCode: 201 });
    };
    reSendOtp = async (req, res) => {
        const { email } = req.body;
        const user = await this._userModel.findOne({ email, confirmedAt: { $exists: false } }, undefined, {
            populate: {
                path: "otp",
                match: {
                    type: types_1.OtpTypeEnum.CONFIRM_EMAIL,
                    isVerified: { $exists: false },
                },
            },
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching account.");
        if (user?.otp?.length)
            throw new res_error_1.ConflictException(`An unexpired OTP already exists. Please check your email or try again later.`);
        await this.sendOtp(user._id);
        return (0, res_1.successResponse)({ res });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this._userModel.findOne({
            email,
            confirmedAt: { $exists: false },
        }, undefined, {
            populate: {
                path: "otp",
                match: {
                    type: types_1.OtpTypeEnum.CONFIRM_EMAIL,
                    isVerified: { $exists: false },
                },
            },
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching account.");
        if (!(user?.otp?.length && (await (0, security_1.compareHash)(otp, user?.otp?.[0]?.code)))) {
            throw new res_error_1.BadRequestException("Invalid OTP or OTP has expired.");
        }
        user.confirmedAt = new Date();
        user.__v += 1;
        await user.save();
        await this._otpModel.deleteMany({
            userId: user._id,
            type: types_1.OtpTypeEnum.CONFIRM_EMAIL,
        });
        return (0, res_1.successResponse)({ res });
    };
    logIn = async (req, res) => {
        const { email, password } = req.body;
        const user = await this._userModel.findOne({
            email,
        });
        if (!user)
            throw new res_error_1.NotFoundException("Fail to find matching account.");
        if (!user.confirmedAt)
            throw new res_error_1.BadRequestException("Please confirm your email before logging in.");
        if (user.provider == types_1.ProviderTypeEnum.GOOGLE) {
            throw new res_error_1.ConflictException("You cannot login with google account.");
        }
        if (!(await (0, security_1.compareHash)(password, user.password))) {
            throw new res_error_1.BadRequestException("Invalid password");
        }
        const { access_token, refresh_token } = await (0, security_1.createLoginCredentials)(user);
        return (0, res_1.successResponse)({
            res,
            data: { credentials: { access_token, refresh_token }, role: user.role },
        });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { name, email, picture, given_name, family_name } = await this.verifyIdToken(idToken);
        let user = await this._userModel.findOne({ email: email });
        if (user) {
            return await this.logInWithGmail(req, res);
        }
        else {
            const newUser = await this._userModel.create({
                fName: given_name,
                lName: family_name,
                username: name,
                email: email,
                confirmedAt: new Date(),
                profileImage: picture,
                provider: types_1.ProviderTypeEnum.GOOGLE,
            });
            if (!newUser)
                throw new res_error_1.BadRequestException("Failed to create user.");
            const { access_token, refresh_token } = await (0, security_1.createLoginCredentials)(newUser);
            return (0, res_1.successResponse)({
                res,
                statusCode: 201,
                data: { credentials: { access_token, refresh_token }, role: newUser.role },
            });
        }
    };
    logInWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyIdToken(idToken);
        const user = await this._userModel.findOne({ email: email });
        if (!user)
            throw new res_error_1.BadRequestException("Not registered account with this gmail.");
        if (user.provider !== types_1.ProviderTypeEnum.GOOGLE) {
            throw new res_error_1.ConflictException(`Email is registered with ${user.provider}. Please log in with ${user.provider} or use another email.`);
        }
        const { access_token, refresh_token } = await (0, security_1.createLoginCredentials)(user);
        return (0, res_1.successResponse)({
            res,
            data: { credentials: { access_token, refresh_token }, role: user.role },
        });
    };
    sendResetPasswordOtp = async (req, res) => {
        const { email } = req.body;
        const user = await this._userModel.findOne({
            email,
            provider: types_1.ProviderTypeEnum.SYSTEM,
            confirmedAt: { $exists: true },
        }, undefined, {
            populate: {
                path: "otp",
                match: { type: types_1.OtpTypeEnum.FORGOT_PASSWORD },
            },
        });
        if (!user)
            throw new res_error_1.NotFoundException("Not matching account with this email.");
        if (user?.otp?.length)
            throw new res_error_1.ConflictException(`An unexpired OTP already exists. Please check your email or try again later.`);
        await this.sendOtp(user._id, types_1.OtpTypeEnum.FORGOT_PASSWORD);
        return (0, res_1.successResponse)({ res });
    };
    verifyResetPasswordOtp = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this._userModel.findOne({
            email,
            provider: types_1.ProviderTypeEnum.SYSTEM,
            confirmedAt: { $exists: true },
        }, undefined, {
            populate: {
                path: "otp",
                match: {
                    type: types_1.OtpTypeEnum.FORGOT_PASSWORD,
                    isVerified: { $exists: false },
                },
            },
        });
        if (!user)
            throw new res_error_1.NotFoundException("Not matching account with this email.");
        if (!(user?.otp?.length && (await (0, security_1.compareHash)(otp, user?.otp?.[0]?.code)))) {
            throw new res_error_1.BadRequestException("Invalid OTP or OTP has expired");
        }
        await this._otpModel.updateOne({
            userId: user._id,
            type: types_1.OtpTypeEnum.FORGOT_PASSWORD,
            isVerified: { $exists: false },
        }, { $set: { isVerified: true } });
        return (0, res_1.successResponse)({ res });
    };
    resetPassword = async (req, res) => {
        const { email, password } = req.body;
        const user = await this._userModel.findOne({
            email,
            provider: types_1.ProviderTypeEnum.SYSTEM,
            confirmedAt: { $exists: true },
        }, undefined, {
            populate: {
                path: "otp",
                match: {
                    type: types_1.OtpTypeEnum.FORGOT_PASSWORD,
                    isVerified: { $exists: true },
                },
            },
        });
        if (!user)
            throw new res_error_1.NotFoundException("Not matching account with this email or OTP not verified.");
        if (user?.otp?.length === 0)
            throw new res_error_1.BadRequestException("Please verify OTP before resetting password.");
        user.password = password;
        user.changeCredentialsTime = new Date();
        user.__v += 1;
        await user.save();
        await this._otpModel.deleteMany({
            userId: user._id,
            type: types_1.OtpTypeEnum.FORGOT_PASSWORD,
            isVerified: { $exists: true },
        });
        return (0, res_1.successResponse)({ res });
    };
}
exports.AuthService = AuthService;
exports.default = new AuthService();
