"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventEmitter = void 0;
const node_events_1 = require("node:events");
const types_1 = require("../types/types");
const sendEmail_1 = require("../../service/sendEmail");
const email_template_1 = require("../../service/email.template");
const res_error_1 = require("../res/res.error");
exports.eventEmitter = new node_events_1.EventEmitter();
exports.eventEmitter.on(types_1.OtpTypeEnum.CONFIRM_EMAIL, async (data) => {
    const { email, otp } = data;
    const isSend = await (0, sendEmail_1.sendEmail)({
        to: email,
        subject: "Confirm your email",
        html: (0, email_template_1.emailTemplate)({ subject: "Confirm your email", otp }),
    });
    if (!isSend)
        throw new res_error_1.BadRequestException("Failed to send email");
});
exports.eventEmitter.on(types_1.OtpTypeEnum.FORGOT_PASSWORD, async (data) => {
    const { email, otp } = data;
    const isSend = await (0, sendEmail_1.sendEmail)({
        to: email,
        subject: "Reset your password",
        html: (0, email_template_1.emailTemplate)({ subject: "Reset your password", otp }),
    });
    if (!isSend)
        throw new res_error_1.BadRequestException("Failed to send email");
});
