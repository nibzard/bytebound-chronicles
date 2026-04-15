import 'dotenv/config';
import { HybridDatabase, defaultHybridConfig } from '../src/database/HybridDatabase.js';
import { logger } from '../src/utils/index.js';

async function setupDatabase() {
  try {
    logger.info('Setting up database...');
    
    const database = new HybridDatabase(defaultHybridConfig);
    await database.initialize();
    
    logger.info('Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();