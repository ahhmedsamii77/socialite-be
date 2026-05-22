"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const res_error_1 = require("./utils/res/res.error");
const middleware_1 = require("./middleware");
const connectDB_1 = require("./DB/connectDB");
const auth_controller_1 = require("./modules/auth/auth.controller");
const user_controller_1 = require("./modules/user/user.controller");
const s3_config_1 = require("./utils/aws/s3.config");
const node_util_1 = require("node:util");
const node_stream_1 = require("node:stream");
const post_controller_1 = require("./modules/post/post.controller");
const notification_controller_1 = require("./modules/notification/notification.controller");
const chat_controller_1 = require("./modules/chat/chat.controller");
const gateway_1 = require("./modules/gateway");
const s3WriteStreamPipe = (0, node_util_1.promisify)(node_stream_1.pipeline);
try {
    (0, dotenv_1.config)({});
}
catch (_) { }
const app = (0, express_1.default)();
const rateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests. Please try again later.",
    statusCode: 429,
    skipSuccessfulRequests: true,
});
const port = process.env.PORT || 5000;
async function bootstrap() {
    await (0, connectDB_1.connectDB)();
    app.use(express_1.default.json(), (0, cors_1.default)({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    }), (0, helmet_1.default)(), rateLimiter);
    app.use((req, res, next) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        next();
    });
    app.get("/", (req, res) => {
        return res
            .status(200)
            .json({ message: "Welcome to the Social App Backend Landing Page ⚡🚀" });
    });
    app.use("/auth", auth_controller_1.authRouter);
    app.use("/user", user_controller_1.userRouter);
    app.use("/post", post_controller_1.postRouter);
    app.use("/notification", notification_controller_1.notificationRouter);
    app.use("/chat", chat_controller_1.chatRouter);
    app.get("/upload/*path", async (req, res) => {
        const { path } = req.params;
        const { downloadName, download = "false" } = req.query;
        const key = path.join("/");
        const s3Res = await (0, s3_config_1.getFile)({ Key: key });
        if (!s3Res?.Body)
            throw new res_error_1.BadRequestException("File to fetch this assets");
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || key.split("/").pop()}"`);
        }
        res.setHeader("Content-Type", s3Res.ContentType || "application/octet-stream");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return await s3WriteStreamPipe(s3Res.Body, res);
    });
    app.get("/upload/pre-signed-url/*path", async (req, res) => {
        const { path, download = "false", downloadName, } = req.query;
        const key = path.join("/");
        const url = await (0, s3_config_1.createGetPresignedUrl)({
            Key: key,
            downloadName,
            download,
        });
        return res.status(200).json({ url });
    });
    app.use((req, res) => {
        throw new res_error_1.NotFoundException(`404 Not Found url ${req.originalUrl} ❌`);
    });
    app.use(middleware_1.gloabalErrorHandling);
    const httpServer = app.listen(port, () => {
        console.log(`🚀 Server is running on port: ${port}`);
    });
    (0, gateway_1.initializeIo)(httpServer);
}
