import { compare, hash } from "bcrypt";

export async function generateHash(
  plainText: string,
  salt: number = Number(process.env.SALT),
): Promise<string> {
  return await hash(plainText, salt);
}


export async function compareHash(plainText:string, cipherText: string): Promise<boolean> {
   return await compare(plainText, cipherText);
}