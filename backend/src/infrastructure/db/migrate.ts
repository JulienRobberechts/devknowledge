import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.join(__dirname, "../../../../.env.local") });

import pool from "./pool";

async function migrate(): Promise<void> {
  const sqlPath = path.join(__dirname, "migrations", "001_init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("Migration complete");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
