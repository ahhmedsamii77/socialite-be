import { Server, Socket } from "socket.io";
import { ChatEvents } from "./chat.events";
import { ChatRepository } from "../../DB/repositories";
import { chatModel } from "../../DB/models/chat.model";

export class ChatGateway {
  private chatEvents = new ChatEvents();
  private _chatModel = new ChatRepository(chatModel);
  constructor() {}

  register = async (socket: Socket, io: Server) => {
    const userId = socket.data.credentials?.user?._id?.toString();

    // Auto-join all group rooms the user belongs to
    if (userId) {
      const groups = await this._chatModel.find({
        participants: { $in: [userId] },
        groupName: { $exists: true },
        roomId: { $exists: true },
      });
      for (const group of groups) {
        if (group.roomId) socket.join(group.roomId);
      }
    }

    // Register all socket event listeners
    this.chatEvents.sendMessage(socket, io);
    this.chatEvents.sendGroupMessage(socket, io);
    this.chatEvents.deleteMessage(socket, io);
    this.chatEvents.deleteChat(socket, io);
    this.chatEvents.joinGroupRoom(socket);
  };
}
