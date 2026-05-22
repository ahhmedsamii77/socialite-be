"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_js_1 = __importDefault(require("crypto-js"));
async function encrypt(plainText, key) {
    return crypto_js_1.default.AES.encrypt(plainText, key).toString();
}
async function decrypt(cipherText, key) {
    return crypto_js_1.default.AES.decrypt(cipherText, key).toString(crypto_js_1.default.enc.Utf8);
}
