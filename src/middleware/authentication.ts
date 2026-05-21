import type { NextFunction, Request, Response } from "express";
import { TokenTypeEnum } from "../utils/types/types";
import { UnauthorizedException } from "../utils/res/res.error";
import { decodeTokenAndFetchUser, getSignature } from "../utils/security";

export function authentication(
  tokenType: TokenTypeEnum = TokenTypeEnum.ACCESS_TOKEN,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    if (!authorization)
      throw new UnauthorizedException("validation error", {
        validationErrors: [
          {
            key: "authorization",
            issues: [
              {
                message: "Authorization header is required",
                path: "authorization",
              },
            ],
          },
        ],
      });
    const [prefix, token] = authorization.split(" ");
    if (!prefix || !token)
      throw new UnauthorizedException("Invalid token format");
    const signature = await getSignature({ prefix, tokenType });
    if (!signature) throw new UnauthorizedException("Invalid token prefix");
    const { user, decoded } = await decodeTokenAndFetchUser({
      token,
      signature,
    });
    if (!user || !decoded) throw new UnauthorizedException("Invalid token");
    req.user = user;
    req.decoded = decoded;
    next();
  };
}
