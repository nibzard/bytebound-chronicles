
import { SQLiteStore } from './SQLiteStore.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Migrator {
  constructor(private sqlite: SQLiteStore) {}

  public async migrate() {
    this.ensureMigrationsTable();
    const migrations = this.getMigrations();
    const appliedMigrations = this.getAppliedMigrations();

    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration)) {
        await this.applyMigration(migration);
      }
    }
  }

  private ensureMigrationsTable() {
    // @ts-ignore
    this.sqlite.transaction(() => {
      // @ts-ignore
      this.sqlite.db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    });
  }

  private getMigrations(): string[] {
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }
    return fs.readdirSync(migrationsDir).sort();
  }

  private getAppliedMigrations(): string[] {
    // @ts-ignore
    const stmt = this.sqlite.db.prepare('SELECT name FROM migrations');
    const rows = stmt.all() as any[];
    return rows.map((row) => row.name);
  }

  private async applyMigration(migration: string) {
    const migrationPath = path.join(__dirname, 'migrations', migration);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    // @ts-ignore
    this.sqlite.transaction(() => {
      // @ts-ignore
      this.sqlite.db.exec(sql);
      // @ts-ignore
      const stmt = this.sqlite.db.prepare('INSERT INTO migrations (name) VALUES (?)');
      stmt.run(migration);
    });
  }
}
