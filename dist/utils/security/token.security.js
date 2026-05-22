"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.createLoginCredentials = createLoginCredentials;
exports.getSignature = getSignature;
exports.decodeTokenAndFetchUser = decodeTokenAndFetchUser;
const jsonwebtoken_1 = require("jsonwebtoken");
const user_model_1 = require("../../DB/models/user.model");
const types_1 = require("../types/types");
const uuid_1 = require("uuid");
const repositories_1 = require("../../DB/repositories");
const res_error_1 = require("../res/res.error");
const revokeToken_model_1 = require("../../DB/models/revokeToken.model");
const _userModel = new repositories_1.UserRepository(user_model_1.userModel);
const _revokeTokenModel = new repositories_1.RevokeTokenRepository(revokeToken_model_1.revokeTokenModel);
async function generateToken({ payload, signature, options, }) {
    return (0, jsonwebtoken_1.sign)(payload, signature, options);
}
async function verifyToken({ token, signature, }) {
    return (0, jsonwebtoken_1.verify)(token, signature);
}
async function createLoginCredentials(user) {
    const jwtid = (0, uuid_1.v4)();
    const access_token = await generateToken({
        payload: { id: user._id, role: user.role },
        signature: user.role === types_1.RoleEnum.USER
            ? process.env.USER_ACCESS_TOKEN
            : process.env.ADMIN_ACCESS_TOKEN,
        options: { expiresIn: "15m", jwtid },
    });
    const refresh_token = await generateToken({
        payload: { id: user._id, role: user.role },
        signature: user.role === types_1.RoleEnum.USER
            ? process.env.USER_REFRESH_TOKEN
            : process.env.ADMIN_REFRESH_TOKEN,
        options: { expiresIn: "7d", jwtid },
    });
    return {
        access_token,
        refresh_token,
    };
}
async function getSignature({ prefix, tokenType = types_1.TokenTypeEnum.ACCESS_TOKEN, }) {
    if (tokenType === types_1.TokenTypeEnum.ACCESS_TOKEN) {
        if (prefix === types_1.SignatureLevel.BEARER)
            return process.env.USER_ACCESS_TOKEN;
        else if (prefix === types_1.SignatureLevel.SYSTEM)
            return process.env.ADMIN_ACCESS_TOKEN;
        else
            return null;
    }
    else if (tokenType === types_1.TokenTypeEnum.REFRESH_TOKEN) {
        if (prefix === types_1.SignatureLevel.BEARER)
            return process.env.USER_REFRESH_TOKEN;
        else if (prefix === types_1.SignatureLevel.SYSTEM)
            return process.env.ADMIN_REFRESH_TOKEN;
        else
            return null;
    }
    else
        return null;
}
async function decodeTokenAndFetchUser({ token, signature, }) {
    try {
        const decoded = await verifyToken({ token, signature });
        const isTokenRevoked = await _revokeTokenModel.findOne({
            jti: decoded.jti,
        });
        if (isTokenRevoked)
            throw new res_error_1.UnauthorizedException("Invalid or old credentials. Please log in again.");
        const user = await _userModel.findById(decoded.id);
        if (!user)
            throw new res_error_1.BadRequestException("Not registered account.");
        if (!user.confirmedAt)
            throw new res_error_1.BadRequestException("Please confirm your account.");
        if ((user?.changeCredentialsTime?.getTime() || 0) > decoded.iat * 1000)
            throw new res_error_1.UnauthorizedException("Invalid or old credentials. Please log in again.");
        return { user, decoded };
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.TokenExpiredError)
            throw new res_error_1.UnauthorizedException("Your session has expired. Please log in again.");
        else if (error instanceof jsonwebtoken_1.JsonWebTokenError)
            throw new res_error_1.UnauthorizedException("Invalid token. Please log in again.");
        else
            throw new res_error_1.UnauthorizedException(error.message || "Invalid token. Please log in again.");
    }
}
