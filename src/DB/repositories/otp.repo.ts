import { Model } from "mongoose";
import { OtpType } from "../../utils/types/types";
import { DBRepository } from "./db.repo";

export class OtpRepository extends DBRepository<OtpType> {
  constructor(protected override readonly model: Model<OtpType>){
    super(model);
  }
}