import path from "node:path";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try { process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch {}

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
  const email = "eleanor.vance@acme.corp";
  const password = "demo1234";
  const normalizedEmail = email.trim().toLowerCase();

  // Exact same query as auth-actions.ts
  const user = await prisma.user.findFirst({ where: { email: normalizedEmail } });

  console.log("user found:", !!user);
  console.log("has passwordHash:", !!user?.passwordHash);
  if (user?.passwordHash) {
    const verified = verifyPassword(password, user.passwordHash);
    console.log("verifyPassword('demo1234'):", verified ? "✓ PASS" : "✗ FAIL");
  }
  console.log("isActive:", user?.isActive);

  // Now simulate the full login check
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    console.log("\n❌ Login check FAILS — would return 'Incorrect email or password'");
  } else if (!user.isActive) {
    console.log("\n❌ Login check FAILS — account deactivated");
  } else {
    console.log("\n✓ Login check PASSES — session would be created");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
