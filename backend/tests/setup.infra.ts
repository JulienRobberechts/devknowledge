import fs from "node:fs";
import path from "node:path";

const URL_FILE = path.join(__dirname, ".db-test-url");
const dbUrl = fs.readFileSync(URL_FILE, "utf8").trim();
process.env.DATABASE_URL = dbUrl;
