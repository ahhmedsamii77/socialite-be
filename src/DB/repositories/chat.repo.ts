import { Model } from "mongoose";
import { ChatType } from "../../utils/types/types";
import { DBRepository } from "./db.repo";

export class ChatRepository extends DBRepository<ChatType> {
  constructor(protected override readonly model: Model<ChatType>) {
    super(model);
  }
}
