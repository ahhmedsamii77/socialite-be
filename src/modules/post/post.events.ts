import { Socket } from "socket.io";

 export class PostEvents {
  constructor() {}

  sayHi = (socket: Socket) => {
    return socket.on("sayHi", (data) => {
    });
  };
}

