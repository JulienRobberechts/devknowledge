import type { IAppSettingsRepository } from "../../../infra-ports/persistence/IAppSettingsRepository";
import pool from "./pool";

export class PgAppSettingsRepository implements IAppSettingsRepository {
  async getAll(): Promise<Record<string, string>> {
    const result = await pool.query("SELECT key, value FROM app_settings");
    return Object.fromEntries(
      result.rows.map((r: { key: string; value: string }) => [r.key, r.value]),
    );
  }

  async setMany(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value],
      );
    }
  }
}
