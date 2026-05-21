import {
  JsonWebTokenError,
  JwtPayload,
  Secret,
  sign,
  SignOptions,
  TokenExpiredError,
  verify,
} from "jsonwebtoken";
import { HUserDocument, userModel } from "../../DB/models/user.model";
import { RoleEnum, SignatureLevel, TokenTypeEnum } from "../types/types";
import { v4 as uuid } from "uuid";
import { RevokeTokenRepository, UserRepository } from "../../DB/repositories";
import {
  BadRequestException,
  UnauthorizedException,
} from "../res/res.error";
import { revokeTokenModel } from "../../DB/models/revokeToken.model";

const _userModel = new UserRepository(userModel);
const _revokeTokenModel = new RevokeTokenRepository(revokeTokenModel);
export async function generateToken({
  payload,
  signature,
  options,
}: {
  payload: object;
  signature: Secret;
  options?: SignOptions;
}): Promise<string> {
  return sign(payload, signature, options);
}

export async function verifyToken({
  token,
  signature,
}: {
  token: string;
  signature: Secret;
}): Promise<JwtPayload> {
  return verify(token, signature) as JwtPayload;
}

export async function createLoginCredentials(
  user: HUserDocument,
): Promise<{ access_token: string; refresh_token: string }> {
  const jwtid = uuid();
  const access_token = await generateToken({
    payload: { id: user._id, role: user.role },
    signature:
      user.role === RoleEnum.USER
        ? process.env.USER_ACCESS_TOKEN!
        : process.env.ADMIN_ACCESS_TOKEN!,
    options: { expiresIn: "15m", jwtid },
  });
  const refresh_token = await generateToken({
    payload: { id: user._id, role: user.role },
    signature:
      user.role === RoleEnum.USER
        ? process.env.USER_REFRESH_TOKEN!
        : process.env.ADMIN_REFRESH_TOKEN!,
    options: { expiresIn: "7d", jwtid },
  });

  return {
    access_token,
    refresh_token,
  };
}

export async function getSignature({
  prefix,
  tokenType = TokenTypeEnum.ACCESS_TOKEN,
}: {
  prefix: string;
  tokenType?: TokenTypeEnum;
}): Promise<Secret | null> {
  if (tokenType === TokenTypeEnum.ACCESS_TOKEN) {
    if (prefix === SignatureLevel.BEARER) return process.env.USER_ACCESS_TOKEN!;
    else if (prefix === SignatureLevel.SYSTEM)
      return process.env.ADMIN_ACCESS_TOKEN!;
    else return null;
  } else if (tokenType === TokenTypeEnum.REFRESH_TOKEN) {
    if (prefix === SignatureLevel.BEARER)
      return process.env.USER_REFRESH_TOKEN!;
    else if (prefix === SignatureLevel.SYSTEM)
      return process.env.ADMIN_REFRESH_TOKEN!;
    else return null;
  } else return null;
}

export async function decodeTokenAndFetchUser({
  token,
  signature,
}: {
  token: string;
  signature: Secret;
}): Promise<{ user: HUserDocument; decoded: JwtPayload }> {
  try {
    const decoded = await verifyToken({ token, signature });
    const isTokenRevoked = await _revokeTokenModel.findOne({
      jti: decoded.jti as string,
    });
    if (isTokenRevoked)
      throw new UnauthorizedException(
        "Invalid or old credentials. Please log in again.",
      );
    const user = await _userModel.findById(decoded.id);
    if (!user) throw new BadRequestException("Not registered account.");
    if (!user.confirmedAt)
      throw new BadRequestException("Please confirm your account.");
    if ((user?.changeCredentialsTime?.getTime() || 0) > decoded.iat! * 1000)
      throw new UnauthorizedException(
        "Invalid or old credentials. Please log in again.",
      );

    return { user, decoded };
  } catch (error: any) {
    if (error instanceof TokenExpiredError)
      throw new UnauthorizedException(
        "Your session has expired. Please log in again.",
      );
    else if (error instanceof JsonWebTokenError)
      throw new UnauthorizedException("Invalid token. Please log in again.");
    else
      throw new UnauthorizedException(
        error.message || "Invalid token. Please log in again.",
      );
  }
}
