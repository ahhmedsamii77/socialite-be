import { ForbiddenException } from "../utils/res/res.error";
import type { NextFunction, Request, Response } from "express";
import { RoleEnum } from "../utils/types/types";

export function authorization(accessRoles: RoleEnum[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!accessRoles.includes(req?.user!.role)) {
      throw new ForbiddenException("Not authorized account.");
    }
    next();
  };
}
