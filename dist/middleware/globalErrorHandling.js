"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gloabalErrorHandling = gloabalErrorHandling;
function gloabalErrorHandling(err, req, res, next) {
    return res.status(err.statusCode || 500).json({
        message: err.message || "something went wrong!",
        cause: err.cause,
        stack: process.env.MOOD === "development" ? err.stack : undefined,
        error: err,
    });
}
