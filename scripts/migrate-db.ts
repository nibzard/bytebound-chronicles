
import { createSQLiteStore, defaultSQLiteConfig } from '../src/database/SQLiteStore.js';
import { Migrator } from '../src/database/Migrator.js';

async function main() {
  const sqliteStore = createSQLiteStore({
    config: defaultSQLiteConfig,
    enableWAL: true,
    enableForeignKeys: true,
    enableLogging: true,
  });

  const migrator = new Migrator(sqliteStore);
  await migrator.migrate();

  console.log('Migrations applied successfully');
}

main().catch((error) => {
  console.error('Failed to apply migrations:', error);
  process.exit(1);
});
