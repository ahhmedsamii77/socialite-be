"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const auth_service_1 = __importDefault(require("./auth.service"));
const AV = __importStar(require("./auth.validation"));
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/signup", (0, middleware_1.validation)(AV.signUpSchema), auth_service_1.default.signUp);
exports.authRouter.post("/resend-otp", (0, middleware_1.validation)(AV.reSendOtpSchema), auth_service_1.default.reSendOtp);
exports.authRouter.patch("/confirm-email", (0, middleware_1.validation)(AV.confirmEmailSchema), auth_service_1.default.confirmEmail);
exports.authRouter.post("/login", (0, middleware_1.validation)(AV.signinSchema), auth_service_1.default.logIn);
exports.authRouter.post("/signup-gmail", (0, middleware_1.validation)(AV.gmailSchema), auth_service_1.default.signupWithGmail);
exports.authRouter.post("/login-gmail", (0, middleware_1.validation)(AV.gmailSchema), auth_service_1.default.logInWithGmail);
exports.authRouter.post("/send-reset-password", (0, middleware_1.validation)(AV.forgetPasswordSchema), auth_service_1.default.sendResetPasswordOtp);
exports.authRouter.post("/verify-reset-password", (0, middleware_1.validation)(AV.verifyResetPasswordOtpSchema), auth_service_1.default.verifyResetPasswordOtp);
exports.authRouter.patch("/reset-password", (0, middleware_1.validation)(AV.resetPasswordSchema), auth_service_1.default.resetPassword);
