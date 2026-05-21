import { EventEmitter } from "node:events";
import { OtpTypeEnum } from "../types/types";
import { sendEmail } from "../../service/sendEmail";
import { emailTemplate } from "../../service/email.template";
import { BadRequestException } from "../res/res.error";

export const eventEmitter = new EventEmitter();

eventEmitter.on(OtpTypeEnum.CONFIRM_EMAIL, async (data) => {
  const { email, otp } = data;
  const isSend = await sendEmail({
    to: email,
    subject: "Confirm your email",
    html: emailTemplate({ subject: "Confirm your email", otp }),
  });
  if (!isSend) throw new BadRequestException("Failed to send email");
});

eventEmitter.on(OtpTypeEnum.FORGOT_PASSWORD, async (data) => {
  const { email, otp } = data;
  const isSend = await sendEmail({
    to: email,
    subject: "Reset your password",
    html: emailTemplate({ subject: "Reset your password", otp }),
  });
  if (!isSend) throw new BadRequestException("Failed to send email");
});
