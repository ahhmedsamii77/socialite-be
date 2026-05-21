import { createTransport, SendMailOptions } from "nodemailer";

export async function sendEmail(mailOptions: SendMailOptions) {
  try {
    const transporter = createTransport({
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
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
