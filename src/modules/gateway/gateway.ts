import { Server, Socket } from "socket.io";
import { UnauthorizedException } from "../../utils/res";
import { decodeTokenAndFetchUser, getSignature } from "../../utils/security";
import { Server as HttpServer } from "node:http";
import { PostGateway } from "../post/post.gateway";
import { ChatGateway } from "../chat/chat.gateway";
export let io: Server;

// in-memory store: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();
export function initializeIo(httpServer: HttpServer) {
  // initialize socket
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // socket middleware
  io.use(async (socket: Socket, next) => {
    try {
      const { authorization } = socket.handshake.auth;
      if (!authorization)
        throw new UnauthorizedException("validation error", {
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
        return next(new UnauthorizedException("Invalid token format"));
      const signature = await getSignature({ prefix });
      if (!signature)
        return next(new UnauthorizedException("Invalid token prefix"));
      const { user, decoded } = await decodeTokenAndFetchUser({
        token,
        signature,
      });
      if (!user || !decoded)
        return next(new UnauthorizedException("Invalid token"));
      socket.data.credentials = { user, decoded };
      socket.join(user._id.toString());
      next();
    } catch (error: any) {
      next(error);
    }
  });

  function handleConnection(socket: Socket) {
    const userId = socket.data.credentials?.user?._id?.toString();
    if (!userId) return;

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    io.emit("user_online", { userId });

    socket.on("get_online_users", (callback) => {
      const ids = Array.from(onlineUsers.keys());
      if (typeof callback === "function") callback(ids);
    });

    // disconnection
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("user_offline", { userId });
          console.log(`❌ User offline: ${userId}`);
        }
      }
    });
  }

  const postGateway = new PostGateway();
  const chatGateway = new ChatGateway();

  // listen to events
  io.on("connection", (socket) => {
    // post gateway
    postGateway.register(socket);
    // chat gateway
    chatGateway.register(socket, io);

    // online/offline tracking
    handleConnection(socket);
  });
}
