"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.initializeIo = initializeIo;
const socket_io_1 = require("socket.io");
const res_1 = require("../../utils/res");
const security_1 = require("../../utils/security");
const post_gateway_1 = require("../post/post.gateway");
const chat_gateway_1 = require("../chat/chat.gateway");
const onlineUsers = new Map();
function initializeIo(httpServer) {
    exports.io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
        },
    });
    exports.io.use(async (socket, next) => {
        try {
            const { authorization } = socket.handshake.auth;
            if (!authorization)
                throw new res_1.UnauthorizedException("validation error", {
                    validationErrors: [
                        {
                            key: "authorization",
                            issues: [
                                {
                                    message: "Authorization header is required",
                                    path: "authorization",
                                },
                            ],
                        },
                    ],
                });
            const [prefix, token] = authorization.split(" ");
            if (!prefix || !token)
                return next(new res_1.UnauthorizedException("Invalid token format"));
            const signature = await (0, security_1.getSignature)({ prefix });
            if (!signature)
                return next(new res_1.UnauthorizedException("Invalid token prefix"));
            const { user, decoded } = await (0, security_1.decodeTokenAndFetchUser)({
                token,
                signature,
            });
            if (!user || !decoded)
                return next(new res_1.UnauthorizedException("Invalid token"));
            socket.data.credentials = { user, decoded };
            socket.join(user._id.toString());
            next();
        }
        catch (error) {
            next(error);
        }
    });
    function handleConnection(socket) {
        const userId = socket.data.credentials?.user?._id?.toString();
        if (!userId)
            return;
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        exports.io.emit("user_online", { userId });
        socket.on("get_online_users", (callback) => {
            const ids = Array.from(onlineUsers.keys());
            if (typeof callback === "function")
                callback(ids);
        });
        socket.on("disconnect", () => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    exports.io.emit("user_offline", { userId });
                    console.log(`❌ User offline: ${userId}`);
                }
            }
        });
    }
    const postGateway = new post_gateway_1.PostGateway();
    const chatGateway = new chat_gateway_1.ChatGateway();
    exports.io.on("connection", (socket) => {
        postGateway.register(socket);
        chatGateway.register(socket, exports.io);
        handleConnection(socket);
    });
}
