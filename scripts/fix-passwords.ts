/**
 * Quick-fix script: sets passwordHash = hash("demo1234") on the two demo
 * accounts that were seeded without a password hash, unblocking login.
 *
 * Run once:  npx tsx scripts/fix-passwords.ts
 */
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
} catch {
  // env already injected
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = hashPassword("demo1234");

  const targets = [
    "eleanor.vance@acme.corp",
    "alex.rivera@acme.corp",
  ];

  for (const email of targets) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      console.log(`⚠  User not found: ${email}`);
      continue;
    }
    if (user.passwordHash) {
      console.log(`✓  ${email} already has a password — skipping`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    console.log(`✓  Set password for ${email}`);
  }

  console.log("\nDone. Both demo accounts can now log in with password: demo1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
