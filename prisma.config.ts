import path from "node:path";
import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // No .env file (e.g. env vars injected directly in production) — ignore.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
