import { Model } from "mongoose";
import { RevokeTokenType } from "../../utils/types/types";
import { DBRepository } from "./db.repo";

export class RevokeTokenRepository extends DBRepository<RevokeTokenType> {
  constructor(protected override readonly model: Model<RevokeTokenType>) {
    super(model);
  }
}
