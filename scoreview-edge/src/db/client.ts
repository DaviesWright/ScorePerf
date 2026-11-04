import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Env } from "../bindings";
import * as schema from "./schema";

export function getDb(env: Env) {
  // Use Cloudflare Hyperdrive accelerated connection pool
  const connectionString = env.HYPERDRIVE.connectionString;
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

export type DbClient = ReturnType<typeof getDb>;

