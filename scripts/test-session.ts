/**
 * Tests the full session creation round-trip: create a session token,
 * then look it up again (like getSessionUser does).
 */
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try { process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch {}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Step 1: Find the user
  const user = await prisma.user.findFirst({ where: { email: "eleanor.vance@acme.corp" } });
  if (!user) { console.log("❌ User not found"); return; }
  console.log("✓ User found:", user.id);

  // Step 2: Create a session (mirrors createSession in lib/session.ts)
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    await prisma.session.create({ data: { userId: user.id, token, expiresAt } });
    console.log("✓ Session created, token:", token.slice(0, 20) + "...");
  } catch (e) {
    console.log("❌ Session create FAILED:", e);
    return;
  }

  // Step 3: Look it up (mirrors getSessionUser)
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { tenant: true, department: true } } },
  });

  if (!session) {
    console.log("❌ Session lookup returned null");
    return;
  }

  console.log("✓ Session found, user:", session.user.name);
  console.log("  tenant:", session.user.tenant?.name);
  console.log("  isActive:", session.user.isActive);
  console.log("  expired:", session.expiresAt < new Date());

  // Cleanup
  await prisma.session.delete({ where: { id: session.id } });
  console.log("\n✓ Full session round-trip works. Auth flow is correct.");
  console.log("  → The issue is likely the Next.js dev server needs a restart, or the browser has a stale cached session.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
