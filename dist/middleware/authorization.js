"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorization = authorization;
const res_error_1 = require("../utils/res/res.error");
function authorization(accessRoles = []) {
    return (req, res, next) => {
        if (!accessRoles.includes(req?.user.role)) {
            throw new res_error_1.ForbiddenException("Not authorized account.");
        }
        next();
    };
}
