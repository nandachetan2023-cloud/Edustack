import { resolveTxt } from "node:dns/promises";

export function domainVerifyRecordName(domain: string) {
  return `_edustack-verify.${domain}`;
}

export async function verifyDomainOwnership(domain: string, expectedToken: string): Promise<{ verified: boolean; reason?: string }> {
  const recordName = domainVerifyRecordName(domain);
  try {
    const records = await resolveTxt(recordName);
    const flat = records.map((chunks) => chunks.join(""));
    const verified = flat.some((value) => value.trim() === expectedToken);
    return verified ? { verified: true } : { verified: false, reason: `TXT record found but did not match expected token at ${recordName}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown DNS error";
    return { verified: false, reason: `Could not resolve ${recordName}: ${message}` };
  }
}
