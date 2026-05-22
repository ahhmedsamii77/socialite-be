"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostEvents = void 0;
class PostEvents {
    constructor() { }
    sayHi = (socket) => {
        return socket.on("sayHi", (data) => {
        });
    };
}
exports.PostEvents = PostEvents;
