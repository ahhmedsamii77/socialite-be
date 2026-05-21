import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/res/res.error";

export function gloabalErrorHandling(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return res.status(err.statusCode || 500).json({
    message: err.message || "something went wrong!",
    cause: err.cause,
    stack: process.env.MOOD === "development" ? err.stack : undefined,
    error: err,
  });
}
