import * as schema from "@shared/schema";
import { DATABASE_URL as CONFIG_DATABASE_URL } from "./config";

// Prefer environment variable, fallback to server/config.ts
const dbUrl = process.env.DATABASE_URL || CONFIG_DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "DATABASE_URL must be set either in the environment or in server/config.ts",
  );
}

// exported bindings for the rest of the app
export let pool: any;
export let db: any;

// If the URL looks like a plain Postgres URL, use the node-postgres client
// Otherwise fall back to the Neon/serverless client which uses WebSockets
if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");

  // For local socket-style connection strings like `postgres:///dbname`,
  // construct a Pool config that does NOT include `connectionString` to
  // avoid node-postgres parsing oddities when host is omitted. Use the OS
  // user as a sensible default for peer auth.
  const os = await import('os');
  const defaultUser = process.env.PGUSER || process.env.USER || os.userInfo().username;

  try {
    // Detect whether the URL includes a hostname. If not, treat as socket-style.
    const parsed = new URL(dbUrl);
    const hasHost = Boolean(parsed.hostname && parsed.hostname !== '');

    let pgPool;
    if (!hasHost) {
      const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined;
      const cfg: any = {
        // Connection pooling settings for remote servers
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
      if (database) cfg.database = database;
      if (defaultUser) cfg.user = defaultUser;
      // connect over the Unix socket directory so we get peer auth (like psql)
      cfg.host = process.env.PGHOST || "/var/run/postgresql";
      if (process.env.PGPORT) cfg.port = Number(process.env.PGPORT);
      // only include password if explicitly provided as env var
      if (process.env.PGPASSWORD) cfg.password = process.env.PGPASSWORD;

      // mask password for logs
      const safeCfg = { ...cfg };
      if (safeCfg.password) safeCfg.password = '****';
      console.log('Initializing pg Pool with config:', safeCfg);
      pgPool = new Pool(cfg);
    } else {
      console.log('Initializing pg Pool with connectionString');
      pgPool = new Pool({
        connectionString: dbUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }

    // Add error event listener for connection issues
    pgPool.on("error", (err: any) => {
      console.error("[DB] Unexpected error on idle client:", err);
    });

    pool = pgPool;
    db = drizzle(pgPool, { schema });
  } catch (err) {
    console.error('Failed to initialize pg Pool:', err);
    throw err;
  }
} else {
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;

  neonConfig.webSocketConstructor = ws;
  const neonPool = new Pool({ connectionString: dbUrl });
  pool = neonPool;
  db = drizzle({ client: neonPool, schema });
}
