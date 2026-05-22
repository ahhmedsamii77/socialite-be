"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const db_repo_1 = require("./db.repo");
class NotificationRepository extends db_repo_1.DBRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.NotificationRepository = NotificationRepository;
