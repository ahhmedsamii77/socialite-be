import type { Response } from "express";

export function successResponse<T = any>({
  res,
  message = "Done",
  data,
  statusCode = 200,
}: {
  res: Response;
  data?: T;
  message?: string;
  statusCode?: number;
}): Response {
  return res.status(statusCode).json({ message, statusCode, data });
}
