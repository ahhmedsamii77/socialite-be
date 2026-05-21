import { Model } from "mongoose";
import { UserType } from "../../utils/types/types";
import { DBRepository } from "./db.repo";

export class UserRepository extends DBRepository<UserType> {
  constructor(protected override readonly model: Model<UserType>) {
    super(model);
  }
}
