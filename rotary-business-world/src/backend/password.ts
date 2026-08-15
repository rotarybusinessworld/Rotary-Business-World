import { hash, verify } from "@node-rs/bcrypt";

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, 12);
}

export function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return verify(plain, hashed);
}
