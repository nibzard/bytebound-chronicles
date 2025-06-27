// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * SQLite store implementation for structured data
 * Handles game saves, player profiles, analytics, and story metadata
 */

import Database from 'better-sqlite3';
import { GameSave, StoryProgress } from '../types/game.js';
import { StoryMetadata } from '../types/story.js';

export interface SQLiteConfig {
  path: string;
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export interface SQLiteStoreOptions {
  config: SQLiteConfig;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  enableLogging?: boolean;
}

export interface PlayerProfile {
  id: string;
  username: string;
  email?: string;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: Record<string, unknown>;
  achievements: string[];
  totalPlayTime: number;
  storiesPlayed: number;
  storiesCompleted: number;
}

export interface GameAnalytics {
  id: string;
  playerId: string;
  storyId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
}

export class SQLiteStore {
  private db: Database.Database;

  constructor(private options: SQLiteStoreOptions) {
    const dbOptions: any = {
      timeout: options.config.timeout ?? 5000,
      verbose: options.config.verbose ? console.log : undefined,
    };

    if (options.config.readonly !== undefined) {
      dbOptions.readonly = options.config.readonly;
    }
    if (options.config.fileMustExist !== undefined) {
      dbOptions.fileMustExist = options.config.fileMustExist;
    }

    this.db = new Database(options.config.path, dbOptions);
    this.initialize();
  }

  private initialize(): void {
    // Enable WAL mode for better concurrency
    if (this.options.enableWAL) {
      this.db.pragma('journal_mode = WAL');
    }

    // Enable foreign key constraints
    if (this.options.enableForeignKeys) {
      this.db.pragma('foreign_keys = ON');
    }

    // Optimize performance settings
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000000');
    this.db.pragma('temp_store = memory');

    this.createTables();
  }

  private createTables(): void {
    // Player profiles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        preferences TEXT NOT NULL DEFAULT '{}',
        achievements TEXT NOT NULL DEFAULT '[]',
        total_play_time INTEGER NOT NULL DEFAULT 0,
        stories_played INTEGER NOT NULL DEFAULT 0,
        stories_completed INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Game saves table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_saves (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        story_id TEXT NOT NULL,
        save_name TEXT NOT NULL,
        game_state TEXT NOT NULL,
        current_beat_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        screenshot TEXT,
        FOREIGN KEY (player_id) REFERENCES player_profiles (id) ON DELETE CASCADE
      );
    `);

    // Story progress tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS story_progress (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        current_beat_id TEXT NOT NULL,
        completed_beats TEXT NOT NULL DEFAULT '[]',
        visited_locations TEXT NOT NULL DEFAULT '[]',
        met_characters TEXT NOT NULL DEFAULT '[]',
        discovered_secrets TEXT NOT NULL DEFAULT '[]',
        ending_implications TEXT NOT NULL DEFAULT '{}',
        last_played DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_play_time INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES player_profiles (id) ON DELETE CASCADE,
        UNIQUE(story_id, player_id)
      );
    `);

    // Story metadata cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS story_metadata (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        author TEXT NOT NULL,
        version TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        estimated_length INTEGER NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        content_warnings TEXT DEFAULT '[]',
        min_age INTEGER,
        language TEXT NOT NULL DEFAULT 'en',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        publication_status TEXT NOT NULL DEFAULT 'draft',
        rating REAL,
        play_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Analytics and telemetry
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_analytics (
        id TEXT PRIMARY KEY,
        player_id TEXT,
        story_id TEXT,
        event_type TEXT NOT NULL,
        event_data TEXT NOT NULL DEFAULT '{}',
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        FOREIGN KEY (player_id) REFERENCES player_profiles (id) ON DELETE SET NULL
      );
    `);

    // Story validation results cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS story_validations (
        story_id TEXT PRIMARY KEY,
        validation_result TEXT NOT NULL,
        validated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES story_metadata (id) ON DELETE CASCADE
      );
    `);

    // Create indexes for better query performance
    this.createIndexes();
  }

  private createIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_game_saves_player_id ON game_saves(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_game_saves_story_id ON game_saves(story_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_progress_player_id ON story_progress(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_progress_story_id ON story_progress(story_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_player_id ON game_analytics(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_story_id ON game_analytics(story_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON game_analytics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_story_metadata_author ON story_metadata(author)',
      'CREATE INDEX IF NOT EXISTS idx_story_metadata_difficulty ON story_metadata(difficulty)',
      'CREATE INDEX IF NOT EXISTS idx_story_metadata_rating ON story_metadata(rating)',
    ];

    for (const index of indexes) {
      this.db.exec(index);
    }
  }

  /**
   * Player Profile Management
   */
  async createPlayerProfile(profile: Omit<PlayerProfile, 'createdAt' | 'lastLoginAt'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO player_profiles (
        id, username, email, preferences, achievements, 
        total_play_time, stories_played, stories_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      profile.id,
      profile.username,
      profile.email,
      JSON.stringify(profile.preferences),
      JSON.stringify(profile.achievements),
      profile.totalPlayTime,
      profile.storiesPlayed,
      profile.storiesCompleted
    );
  }

  async getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
    const stmt = this.db.prepare('SELECT * FROM player_profiles WHERE id = ?');
    const row = stmt.get(playerId) as any;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      lastLoginAt: new Date(row.last_login_at),
      preferences: JSON.parse(row.preferences),
      achievements: JSON.parse(row.achievements),
      totalPlayTime: row.total_play_time,
      storiesPlayed: row.stories_played,
      storiesCompleted: row.stories_completed,
    };
  }

  async updatePlayerProfile(playerId: string, updates: Partial<PlayerProfile>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.username) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.preferences) {
      fields.push('preferences = ?');
      values.push(JSON.stringify(updates.preferences));
    }
    if (updates.achievements) {
      fields.push('achievements = ?');
      values.push(JSON.stringify(updates.achievements));
    }
    if (updates.totalPlayTime !== undefined) {
      fields.push('total_play_time = ?');
      values.push(updates.totalPlayTime);
    }
    if (updates.storiesPlayed !== undefined) {
      fields.push('stories_played = ?');
      values.push(updates.storiesPlayed);
    }
    if (updates.storiesCompleted !== undefined) {
      fields.push('stories_completed = ?');
      values.push(updates.storiesCompleted);
    }

    if (fields.length === 0) return;

    fields.push('last_login_at = CURRENT_TIMESTAMP');
    values.push(playerId);

    const stmt = this.db.prepare(`
      UPDATE player_profiles 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Game Save Management
   */
  async saveGame(gameSave: GameSave): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO game_saves (
        id, player_id, story_id, save_name, game_state, 
        current_beat_id, created_at, description, screenshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      gameSave.id,
      gameSave.playerId,
      gameSave.storyId,
      gameSave.saveName,
      JSON.stringify(gameSave.gameState),
      gameSave.currentBeatId,
      gameSave.createdAt.toISOString(),
      gameSave.description,
      gameSave.screenshot
    );
  }

  async loadGame(saveId: string): Promise<GameSave | null> {
    const stmt = this.db.prepare('SELECT * FROM game_saves WHERE id = ?');
    const row = stmt.get(saveId) as any;

    if (!row) return null;

    return {
      id: row.id,
      playerId: row.player_id,
      storyId: row.story_id,
      saveName: row.save_name,
      gameState: JSON.parse(row.game_state),
      currentBeatId: row.current_beat_id,
      createdAt: new Date(row.created_at),
      description: row.description,
      screenshot: row.screenshot,
    };
  }

  async getPlayerSaves(playerId: string): Promise<GameSave[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM game_saves 
      WHERE player_id = ? 
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(playerId) as any[];
    return rows.map(row => ({
      id: row.id,
      playerId: row.player_id,
      storyId: row.story_id,
      saveName: row.save_name,
      gameState: JSON.parse(row.game_state),
      currentBeatId: row.current_beat_id,
      createdAt: new Date(row.created_at),
      description: row.description,
      screenshot: row.screenshot,
    }));
  }

  async deleteSave(saveId: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM game_saves WHERE id = ?');
    const result = stmt.run(saveId);
    return result.changes > 0;
  }

  /**
   * Story Progress Tracking
   */
  async updateStoryProgress(progress: StoryProgress): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO story_progress (
        id, story_id, player_id, current_beat_id, completed_beats,
        visited_locations, met_characters, discovered_secrets,
        ending_implications, total_play_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = `${progress.storyId}:${progress.playerId}`;
    stmt.run(
      id,
      progress.storyId,
      progress.playerId,
      progress.currentBeatId,
      JSON.stringify(progress.completedBeats),
      JSON.stringify(progress.visitedLocations),
      JSON.stringify(progress.metCharacters),
      JSON.stringify(progress.discoveredSecrets),
      JSON.stringify(progress.endingImplications),
      progress.totalPlayTime
    );
  }

  async getStoryProgress(storyId: string, playerId: string): Promise<StoryProgress | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM story_progress 
      WHERE story_id = ? AND player_id = ?
    `);

    const row = stmt.get(storyId, playerId) as any;
    if (!row) return null;

    return {
      storyId: row.story_id,
      playerId: row.player_id,
      currentBeatId: row.current_beat_id,
      completedBeats: JSON.parse(row.completed_beats),
      visitedLocations: JSON.parse(row.visited_locations),
      metCharacters: JSON.parse(row.met_characters),
      discoveredSecrets: JSON.parse(row.discovered_secrets),
      endingImplications: JSON.parse(row.ending_implications),
      lastPlayed: new Date(row.last_played),
      totalPlayTime: row.total_play_time,
    };
  }

  /**
   * Story Metadata Management
   */
  async storeStoryMetadata(metadata: StoryMetadata): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO story_metadata (
        id, title, description, author, version, difficulty,
        estimated_length, tags, content_warnings, min_age,
        language, created_at, updated_at, publication_status,
        rating, play_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      metadata.id,
      metadata.title,
      metadata.description,
      metadata.author,
      metadata.version,
      metadata.difficulty,
      metadata.estimatedLength,
      JSON.stringify(metadata.tags),
      JSON.stringify(metadata.contentWarnings ?? []),
      metadata.minAge,
      metadata.language,
      metadata.createdAt.toISOString(),
      metadata.updatedAt.toISOString(),
      metadata.publicationStatus,
      metadata.rating,
      metadata.playCount ?? 0
    );
  }

  async getStoryMetadata(storyId: string): Promise<StoryMetadata | null> {
    const stmt = this.db.prepare('SELECT * FROM story_metadata WHERE id = ?');
    const row = stmt.get(storyId) as any;

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      author: row.author,
      version: row.version,
      difficulty: row.difficulty,
      estimatedLength: row.estimated_length,
      tags: JSON.parse(row.tags),
      contentWarnings: JSON.parse(row.content_warnings || '[]'),
      minAge: row.min_age,
      language: row.language,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      publicationStatus: row.publication_status,
      rating: row.rating,
      playCount: row.play_count,
    };
  }

  /**
   * Analytics and Telemetry
   */
  async recordAnalytics(analytics: GameAnalytics): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO game_analytics (
        id, player_id, story_id, event_type, event_data, session_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      analytics.id,
      analytics.playerId,
      analytics.storyId,
      analytics.eventType,
      JSON.stringify(analytics.eventData),
      analytics.sessionId
    );
  }

  async getAnalytics(filters: {
    playerId?: string;
    storyId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<GameAnalytics[]> {
    let query = 'SELECT * FROM game_analytics WHERE 1=1';
    const params: unknown[] = [];

    if (filters.playerId) {
      query += ' AND player_id = ?';
      params.push(filters.playerId);
    }
    if (filters.storyId) {
      query += ' AND story_id = ?';
      params.push(filters.storyId);
    }
    if (filters.eventType) {
      query += ' AND event_type = ?';
      params.push(filters.eventType);
    }
    if (filters.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.endDate.toISOString());
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      playerId: row.player_id,
      storyId: row.story_id,
      eventType: row.event_type,
      eventData: JSON.parse(row.event_data),
      timestamp: new Date(row.timestamp),
      sessionId: row.session_id,
    }));
  }

  /**
   * Database Maintenance
   */
  async vacuum(): Promise<void> {
    this.db.exec('VACUUM');
  }

  async optimize(): Promise<void> {
    this.db.exec('PRAGMA optimize');
  }

  async backup(backupPath: string): Promise<void> {
    await this.db.backup(backupPath);
  }

  close(): void {
    this.db.close();
  }

  isOpen(): boolean {
    return this.db.open;
  }

  /**
   * Transaction Support
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}

/**
 * Factory function for creating SQLite store instances
 */
export function createSQLiteStore(options: SQLiteStoreOptions): SQLiteStore {
  return new SQLiteStore(options);
}

/**
 * Default configuration for development
 */
export const defaultSQLiteConfig: SQLiteConfig = {
  path: './data/game.db',
  timeout: 5000,
  verbose: false,
};
