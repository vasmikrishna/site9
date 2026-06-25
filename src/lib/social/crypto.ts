/**
 * AES-256-GCM encryption/decryption for OAuth access tokens stored at rest.
 *
 * Format (colon-separated, each segment base64):
 *   <iv>:<authTag>:<ciphertext>
 *
 * Key derivation: SHA-256 of SOCIAL_TOKEN_ENC_KEY (or SESSION_SECRET, or the
 * hard-coded dev fallback) — always 32 bytes regardless of input length.
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto"

function deriveKey(): Buffer {
  const secret =
    process.env.SOCIAL_TOKEN_ENC_KEY ??
    process.env.SESSION_SECRET ??
    "dev-social-key"
  return createHash("sha256").update(secret).digest()
}

/**
 * Encrypts a plain-text token string.
 * Returns a colon-separated base64 string: `iv:authTag:ciphertext`.
 */
export function encryptToken(plain: string): string {
  const key = deriveKey()
  const iv = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

/**
 * Decrypts a token produced by `encryptToken`.
 * Throws a clear error if the input is malformed or authentication fails.
 */
export function decryptToken(enc: string): string {
  const parts = enc.split(":")
  if (parts.length !== 3) {
    throw new Error("decryptToken: invalid format — expected iv:authTag:ciphertext")
  }
  const [ivB64, authTagB64, ciphertextB64] = parts
  const key = deriveKey()
  const iv = Buffer.from(ivB64, "base64")
  const authTag = Buffer.from(authTagB64, "base64")
  const ciphertext = Buffer.from(ciphertextB64, "base64")
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  } catch {
    throw new Error("decryptToken: decryption failed — wrong key or corrupted data")
  }
}
