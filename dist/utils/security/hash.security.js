"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHash = generateHash;
exports.compareHash = compareHash;
const bcrypt_1 = require("bcrypt");
async function generateHash(plainText, salt = Number(process.env.SALT)) {
    return await (0, bcrypt_1.hash)(plainText, salt);
}
async function compareHash(plainText, cipherText) {
    return await (0, bcrypt_1.compare)(plainText, cipherText);
}
