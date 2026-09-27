import { randomBytes, createHash } from "node:crypto";

export function generateApiKey() {
  const raw = randomBytes(24).toString("base64url");
  const plaintext = `esk_live_${raw}`;
  const keyPrefix = plaintext.slice(0, 14);
  const keyHash = hashApiKey(plaintext);
  return { plaintext, keyPrefix, keyHash };
}

export function hashApiKey(plaintext: string) {
  return createHash("sha256").update(plaintext).digest("hex");
}
