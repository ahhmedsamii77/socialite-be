import { Model } from "mongoose";
import { FriendRequestType } from "../../utils/types/types";
import { DBRepository } from "./db.repo";

export class FriendRequestRepository extends DBRepository<FriendRequestType> {
  constructor(protected override readonly model: Model<FriendRequestType>) {
    super(model);
  }
}
