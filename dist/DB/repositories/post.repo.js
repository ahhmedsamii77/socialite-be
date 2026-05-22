"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRepository = void 0;
const db_repo_1 = require("./db.repo");
class PostRepository extends db_repo_1.DBRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
    findPostsByCursorAndDelete = async (filter, select, options) => {
        const cursor = this.model.find(filter, select, options).cursor();
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            const post = await this.model.deleteOne({
                _id: doc._id,
                paranoid: false,
            });
            if (!post.deletedCount)
                throw new Error("Failed to delete post.");
        }
    };
}
exports.PostRepository = PostRepository;
