"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authentication = authentication;
const types_1 = require("../utils/types/types");
const res_error_1 = require("../utils/res/res.error");
const security_1 = require("../utils/security");
function authentication(tokenType = types_1.TokenTypeEnum.ACCESS_TOKEN) {
    return async (req, res, next) => {
        const { authorization } = req.headers;
        if (!authorization)
            throw new res_error_1.UnauthorizedException("validation error", {
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
            throw new res_error_1.UnauthorizedException("Invalid token format");
        const signature = await (0, security_1.getSignature)({ prefix, tokenType });
        if (!signature)
            throw new res_error_1.UnauthorizedException("Invalid token prefix");
        const { user, decoded } = await (0, security_1.decodeTokenAndFetchUser)({
            token,
            signature,
        });
        if (!user || !decoded)
            throw new res_error_1.UnauthorizedException("Invalid token");
        req.user = user;
        req.decoded = decoded;
        next();
    };
}
