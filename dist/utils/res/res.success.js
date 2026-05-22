"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
function successResponse({ res, message = "Done", data, statusCode = 200, }) {
    return res.status(statusCode).json({ message, statusCode, data });
}
