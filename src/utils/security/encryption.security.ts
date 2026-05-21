import CryptoJS from "crypto-js";
export async function encrypt(plainText: string, key: string): Promise<string> {
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

export async function decrypt(
  cipherText: string,
  key: string,
): Promise<string> {
  return CryptoJS.AES.decrypt(cipherText, key).toString(CryptoJS.enc.Utf8);
}
