import "dotenv/config";
import { defineConfig } from "drizzle-kit";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

const url = must("DATABASE_URL");

try {
  new URL(url);
} catch {
  throw new Error("DATABASE_URL is not a valid URL");
}

export default defineConfig({
  out: "migrations",
  schema: "shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
