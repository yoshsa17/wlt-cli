import { argon2, Argon2Parameters, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { EncryptedPayload } from "../types/crypto.js";

export const AES_256_GCM_CONFIG = {
  keyLength: 32,
  saltLength: 16,
  ivLength: 12,
} as const;

const ARGON2_CONFIG = {
  keyLength: 32, // AES-256-GCM key length
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
} as const;

/**
 * Derives a 32-byte encryption key from a password and salt with Argon2id.
 * @see https://nodejs.org/docs/latest/api/crypto.html#cryptoargon2algorithm-parameters-callback
 */
export const deriveKeyFromPassword = async (password: string, salt: Buffer): Promise<Buffer> => {
  const param: Argon2Parameters = {
    message: password,
    nonce: salt,
    tagLength: AES_256_GCM_CONFIG.keyLength,
    memory: ARGON2_CONFIG.memoryCost,
    passes: ARGON2_CONFIG.timeCost,
    parallelism: ARGON2_CONFIG.parallelism,
  };

  return new Promise((resolve, reject) =>
    argon2("argon2id", param, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    }),
  );
};

/**
 * Encrypts a plaintext string into an AES-256-GCM payload.
 */
export const encryptPayload = async (plaintext: string, password: string): Promise<EncryptedPayload> => {
  const salt = randomBytes(AES_256_GCM_CONFIG.saltLength);
  const iv = randomBytes(AES_256_GCM_CONFIG.ivLength);
  const key = await deriveKeyFromPassword(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
};

/**
 * Decrypts an AES-256-GCM payload into a plaintext string.
 */
export const decryptPayload = async (payload: EncryptedPayload, password: string): Promise<string> => {
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const key = await deriveKeyFromPassword(password, salt);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};
