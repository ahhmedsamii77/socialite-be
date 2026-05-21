import {
  Model,
  ProjectionType,
  QueryFilter,
  QueryOptions,
} from "mongoose";
import { PostType } from "../../utils/types/types";
import { DBRepository } from "./db.repo";

export class PostRepository extends DBRepository<PostType> {
  constructor(protected override readonly model: Model<PostType>) {
    super(model);
  }
  findPostsByCursorAndDelete = async (
    filter: QueryFilter<PostType>,
    select?: ProjectionType<PostType>,
    options?: QueryOptions,
  )=> {
    const cursor = this.model.find(filter, select, options).cursor();
    for (
      let doc = await cursor.next();
      doc != null;
      doc = await cursor.next()
    ) {
      const post = await this.model.deleteOne({
        _id: doc._id,
        paranoid: false,
      });
      if (!post.deletedCount) throw new Error("Failed to delete post.");
    }
  };
}
