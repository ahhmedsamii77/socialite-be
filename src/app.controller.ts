import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { BadRequestException, NotFoundException } from "./utils/res/res.error";
import { gloabalErrorHandling } from "./middleware";
import { connectDB } from "./DB/connectDB";
import { authRouter } from "./modules/auth/auth.controller";
import { userRouter } from "./modules/user/user.controller";
import { createGetPresignedUrl, getFile } from "./utils/aws/s3.config";
import { promisify } from "node:util";
import { pipeline } from "node:stream";
import { postRouter } from "./modules/post/post.controller";
import { notificationRouter } from "./modules/notification/notification.controller";
import { chatRouter } from "./modules/chat/chat.controller";
import { initializeIo } from "./modules/gateway";

const s3WriteStreamPipe = promisify(pipeline);
// Load .env file in development; in production (AWS) env vars are injected directly
try { config({  }); } catch (_) { /* env vars injected by cloud provider */ }
const app = express();
const rateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 2000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests. Please try again later.",
  statusCode: 429,
  skipSuccessfulRequests: true,
});
const port = process.env.PORT || 5000;
export async function bootstrap() {
  // connect to db
  await connectDB();

  // confgure express
  app.use(
    express.json(),
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    }),
    helmet(),
    rateLimiter,
  );
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  // main route
  app.get("/", (req: Request, res: Response) => {
    return res
      .status(200)
      .json({ message: "Welcome to the Social App Backend Landing Page ⚡🚀" });
  });

  // sub routes
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);
  app.use("/notification", notificationRouter);
  app.use("/chat", chatRouter);
  

  // get file
  app.get("/upload/*path", async (req: Request, res: Response) => {
    const { path } = req.params as { path: string[] };
    const { downloadName, download = "false" } = req.query as {
      downloadName: string;
      download: string;
    };
    const key = path.join("/");
    const s3Res = await getFile({ Key: key });
    if (!s3Res?.Body)
      throw new BadRequestException("File to fetch this assets");
    if (download === "true") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${downloadName || key.split("/").pop()}"`,
      );
    }
    res.setHeader(
      "Content-Type",
      (s3Res.ContentType as string) || "application/octet-stream",
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    return await s3WriteStreamPipe(s3Res.Body as NodeJS.ReadableStream, res);
  });

  // get pre signed url
  app.get(
    "/upload/pre-signed-url/*path",
    async (req: Request, res: Response) => {
      const {
        path,
        download = "false",
        downloadName,
      } = req.query as {
        path: string[];
        download: string;
        downloadName: string;
      };
      const key = path.join("/");
      const url = await createGetPresignedUrl({
        Key: key,
        downloadName,
        download,
      });
      return res.status(200).json({ url });
    },
  );

  // unhandle routes
  app.use((req: Request, res: Response) => {
    throw new NotFoundException(`404 Not Found url ${req.originalUrl} ❌`);
  });

  // global error handling
  app.use(gloabalErrorHandling);

  // start server
  const httpServer = app.listen(port, () => {
    console.log(`🚀 Server is running on port: ${port}`);
  });

  // socket io init
  initializeIo(httpServer);
}
