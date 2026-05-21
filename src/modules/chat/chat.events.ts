import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";

export class ChatEvents {
  private _chatService = new ChatService();
  constructor() {}

  /** OVO: send direct message */
  sendMessage = (socket: Socket, io: Server) => {
    socket.on("sendMessage", (data) => {
      this._chatService.sendMessage({ ...data, socket, io });
    });
  };

  /** OVM: send group message */
  sendGroupMessage = (socket: Socket, io: Server) => {
    socket.on("sendGroupMessage", (data) => {
      this._chatService.sendGroupMessage({ ...data, socket, io });
    });
  };

  /** Both: delete a single message */
  deleteMessage = (socket: Socket, io: Server) => {
    socket.on("deleteMessage", (data) => {
      this._chatService.deleteMessageSocket({ ...data, socket, io });
    });
  };

  /** Both: delete chat or leave group */
  deleteChat = (socket: Socket, io: Server) => {
    socket.on("deleteChat", (data) => {
      this._chatService.deleteChatSocket({ ...data, socket, io });
    });
  };

  /** OVM: client requests to join a group room */
  joinGroupRoom = (socket: Socket) => {
    socket.on("joinGroupRoom", ({ roomId }: { roomId: string }) => {
      if (roomId) socket.join(roomId);
    });
  };
}
