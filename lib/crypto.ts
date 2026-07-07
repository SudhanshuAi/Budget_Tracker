import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getSecret(): Buffer {
  const secret = process.env.AI_KEY_SECRET;
  if (!secret) {
    throw new Error("AI_KEY_SECRET environment variable is not set");
  }
  // Derive a 32-byte key from the secret
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptApiKey(plaintext: string): string {
  const key = getSecret();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Encode as base64: iv + authTag + ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptApiKey(ciphertext: string): string {
  const key = getSecret();
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
