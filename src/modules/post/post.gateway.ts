import { Socket } from "socket.io";
import { PostEvents } from "./post.events";

export class PostGateway {
  private postEvents = new PostEvents();
  constructor() {}
  register = (socket: Socket) => {
    this.postEvents.sayHi(socket);
  };
}
