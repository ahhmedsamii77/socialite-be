"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = require("nodemailer");
async function sendEmail(mailOptions) {
    try {
        const transporter = (0, nodemailer_1.createTransport)({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });
        const info = await transporter.sendMail({
            ...mailOptions,
            from: `"${process.env.APP_NAME}" <${process.env.EMAIL}>`,
        });
        return info.accepted.length > 0;
    }
    catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}
