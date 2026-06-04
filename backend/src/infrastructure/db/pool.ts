import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://devknowledge:devknowledge@localhost:5432/devknowledge",
});

export default pool;
