import fs from "node:fs";
import path from "node:path";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";

const URL_FILE = path.join(__dirname, ".db-test-url");

let container: StartedPostgreSqlContainer;

export async function setup(): Promise<void> {
  console.log("[globalSetup:pg] Starting PostgreSQL container...");
  container = await new PostgreSqlContainer("pgvector/pgvector:pg16")
    .withDatabase("test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const dbUrl = container.getConnectionUri();
  console.log("[globalSetup:pg] Container started, running migrations...");

  const pool = new Pool({ connectionString: dbUrl });
  const migrationsDir = path.join(__dirname, "../src/infra/persistence/db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
  }
  await pool.end();

  fs.writeFileSync(URL_FILE, dbUrl, "utf8");
  console.log("[globalSetup:pg] Migrations done.");
}

export async function teardown(): Promise<void> {
  if (fs.existsSync(URL_FILE)) fs.unlinkSync(URL_FILE);
  await container?.stop();
  console.log("[globalSetup:pg] Container stopped.");
}
