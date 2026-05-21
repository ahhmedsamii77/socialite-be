import type { NextFunction, Request, Response } from "express";
import type { ReqType, SchemaType } from "../utils/types/types";
import { BadRequestException } from "../utils/res/res.error";

export function validation(schema: SchemaType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors = [];
    for (const key of Object.keys(schema) as ReqType[]) {
      if (req?.file) req.body.attachment = req.file;
      if (req?.files) req.body.attachments = req.files;
      const result = schema[key]?.safeParse(req[key]);
      if (!result?.success) {
        validationErrors.push({
          key,
          issues: result?.error.issues.map((issue) => {
            return {
              message: issue.message,
              path: issue.path,
            };
          }),
        });
      }
    }
    if (validationErrors.length) {
      throw new BadRequestException("validation error", {
        validationErrors,
      });
    }
    return next();
  };
}
