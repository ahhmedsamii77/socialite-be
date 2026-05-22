"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = require("mongoose");
async function connectDB() {
    (0, mongoose_1.connect)(process.env.MONGO_URI)
        .then(() => console.log("Success to connect DB 🚀"))
        .catch((error) => console.log("Fail to connect DB ❌", error));
}
