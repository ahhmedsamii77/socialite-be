"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpRepository = void 0;
const db_repo_1 = require("./db.repo");
class OtpRepository extends db_repo_1.DBRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.OtpRepository = OtpRepository;
