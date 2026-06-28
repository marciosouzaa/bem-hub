import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTION_VERSION = "v1";
const IV_LENGTH = 12;

export class EncryptionConfigError extends Error {
  constructor() {
    super("APP_ENCRYPTION_KEY não configurada.");
    this.name = "EncryptionConfigError";
  }
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(value: string) {
  const [version, encodedIv, encodedTag, encodedEncrypted] = value.split(":");

  if (version !== ENCRYPTION_VERSION || !encodedIv || !encodedTag || !encodedEncrypted) {
    throw new Error("Formato de segredo criptografado inválido.");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedEncrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey() {
  const secret = process.env.APP_ENCRYPTION_KEY;

  if (!secret) {
    throw new EncryptionConfigError();
  }

  return createHash("sha256").update(secret).digest();
}
