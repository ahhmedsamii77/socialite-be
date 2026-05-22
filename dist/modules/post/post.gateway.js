"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostGateway = void 0;
const post_events_1 = require("./post.events");
class PostGateway {
    postEvents = new post_events_1.PostEvents();
    constructor() { }
    register = (socket) => {
        this.postEvents.sayHi(socket);
    };
}
exports.PostGateway = PostGateway;
