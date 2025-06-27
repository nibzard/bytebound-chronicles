// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Database layer exports
 * Provides unified access to LMDB, SQLite, and hybrid database services
 */

export { LMDBStore, createLMDBStore, defaultLMDBConfig } from './LMDBStore.js';
export { SQLiteStore, createSQLiteStore, defaultSQLiteConfig } from './SQLiteStore.js';
export { HybridDatabase, createHybridDatabase, defaultHybridConfig } from './HybridDatabase.js';

export type { LMDBConfig, LMDBStoreOptions } from './LMDBStore.js';
export type { 
  SQLiteConfig, 
  SQLiteStoreOptions, 
  PlayerProfile as DatabasePlayerProfile, 
  GameAnalytics 
} from './SQLiteStore.js';
export type { HybridDatabaseConfig, DatabaseStats } from './HybridDatabase.js';
