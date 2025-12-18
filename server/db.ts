import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = process.env.DATABASE_URL;

// exported bindings for the rest of the app
export let pool: any;
export let db: any;

// If the URL looks like a plain Postgres URL, use the node-postgres client
// Otherwise fall back to the Neon/serverless client which uses WebSockets
if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");

  const pgPool = new Pool({ connectionString: dbUrl });
  pool = pgPool;
  db = drizzle(pgPool, { schema });
} else {
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;

  neonConfig.webSocketConstructor = ws;
  const neonPool = new Pool({ connectionString: dbUrl });
  pool = neonPool;
  db = drizzle({ client: neonPool, schema });
}
