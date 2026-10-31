import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.WS_NO_BUFFER_UTIL) {
  process.env.WS_NO_BUFFER_UTIL = "1";
}

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Ensure WebSocket is configured for Neon pooling & transaction support
if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== "test") {
  console.warn("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: connectionString || "" });
export const db = drizzle(pool, { schema });
export { schema };
