/**
 * Diagnostic: check if demo users exist, have a password hash,
 * and whether verification works.
 */
import path from "node:path";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
} catch {}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(derivedHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  const emails = ["eleanor.vance@acme.corp", "alex.rivera@acme.corp"];

  for (const email of emails) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      console.log(`\n❌ User NOT FOUND in DB: ${email}`);
      continue;
    }
    console.log(`\n✓ User found: ${email}`);
    console.log(`  isActive:     ${user.isActive}`);
    console.log(`  passwordHash: ${user.passwordHash ? user.passwordHash.slice(0, 40) + "…" : "NULL ← THIS IS THE BUG"}`);

    if (user.passwordHash) {
      const ok = verifyPassword("demo1234", user.passwordHash);
      console.log(`  verify("demo1234"): ${ok ? "✓ PASS" : "✗ FAIL"}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
