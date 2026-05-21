import { Model } from "mongoose";
import { CommentType } from "../../utils/types/types";
import { DBRepository } from "./db.repo";

export class CommentRepository extends DBRepository<CommentType> {
  constructor(protected override readonly model: Model<CommentType>) {
    super(model);
  }
}
