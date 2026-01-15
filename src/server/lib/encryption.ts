/**
 * Token encryption/decryption utilities
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Get encryption key from environment variable
 * The key should be a base64-encoded 32-byte key
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. Generate a secure key using: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }

  try {
    const decodedKey = Buffer.from(key, "base64");

    // AES-256-GCM requires exactly 32 bytes (256 bits)
    if (decodedKey.length !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must decode to exactly 32 bytes, but got ${decodedKey.length} bytes. ` +
          `Generate a new key using: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
      );
    }

    return decodedKey;
  } catch (error) {
    if (error instanceof Error && error.message.includes("32 bytes")) {
      throw error;
    }
    throw new Error(
      `ENCRYPTION_KEY must be a valid base64-encoded 32-byte key. Error: ${error instanceof Error ? error.message : "Invalid base64"}`
    );
  }
}

/**
 * Encrypt a plaintext token
 * @param plaintext - The token to encrypt
 * @returns Encrypted token as base64 string (format: iv:tag:encrypted)
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV length
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (all base64)
  const result = `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;

  return result;
}

/**
 * Decrypt an encrypted token
 * @param encryptedText - The encrypted token (format: iv:tag:encrypted)
 * @returns Decrypted token as string
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error("Cannot decrypt empty string");
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivBase64, tagBase64, encryptedBase64] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, "base64");
    const tag = Buffer.from(tagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error("Decryption failed: Unknown error");
  }
}
