"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = validation;
const res_error_1 = require("../utils/res/res.error");
function validation(schema) {
    return (req, res, next) => {
        const validationErrors = [];
        for (const key of Object.keys(schema)) {
            if (req?.file)
                req.body.attachment = req.file;
            if (req?.files)
                req.body.attachments = req.files;
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
            throw new res_error_1.BadRequestException("validation error", {
                validationErrors,
            });
        }
        return next();
    };
}
