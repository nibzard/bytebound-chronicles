
import { Client, Transaction } from "@libsql/client";
import { StoryProgress } from "../types/game";
import { SQLiteStore } from "./SQLiteStore";

export class TursoSync {
  private client: Client;
  private sqlite: SQLiteStore;

  constructor(url: string, authToken: string, sqlite: SQLiteStore) {
    this.client = this.createClient(url, authToken);
    this.sqlite = sqlite;
  }

  private createClient(url: string, authToken: string): Client {
    if (!url || !authToken) {
      throw new Error("Turso URL and auth token are required.");
    }
    // @ts-ignore
    return new Client({
      url,
      authToken,
    });
  }

  public async sync() {
    const tx = await this.client.transaction("write");
    try {
      await this.createTables(tx);
      const lastSyncTimestamp = await this.getLastSyncTimestamp(tx);
      const progress = await this.sqlite.getStoryProgressSince(lastSyncTimestamp);
      if (progress.length > 0) {
        await this.syncStoryProgress(tx, progress);
      }
      await this.updateLastSyncTimestamp(tx);
      await tx.commit();
    } catch (error) {
      if (tx) {
        await tx.rollback();
      }
      throw error;
    }
  }

  public async createTables(tx: Transaction) {
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS story_progress (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        current_beat_id TEXT,
        completed_beats TEXT,
        visited_locations TEXT,
        met_characters TEXT,
        discovered_secrets TEXT,
        ending_implications TEXT,
        last_played TEXT NOT NULL,
        total_play_time INTEGER NOT NULL
      );
    `);
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id INTEGER PRIMARY KEY,
        last_sync_timestamp TEXT NOT NULL
      );
    `);
  }

  public async syncStoryProgress(tx: Transaction, progress: StoryProgress[]) {
    for (const p of progress) {
      const id = `${p.storyId}:${p.playerId}`;
      await tx.execute({
        sql: `
          INSERT INTO story_progress (id, story_id, player_id, current_beat_id, completed_beats, visited_locations, met_characters, discovered_secrets, ending_implications, last_played, total_play_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            current_beat_id = excluded.current_beat_id,
            completed_beats = excluded.completed_beats,
            visited_locations = excluded.visited_locations,
            met_characters = excluded.met_characters,
            discovered_secrets = excluded.discovered_secrets,
            ending_implications = excluded.ending_implications,
            last_played = excluded.last_played,
            total_play_time = excluded.total_play_time;
        `,
        args: [
          id,
          p.storyId,
          p.playerId,
          p.currentBeatId,
          JSON.stringify(p.completedBeats),
          JSON.stringify(p.visitedLocations),
          JSON.stringify(p.metCharacters),
          JSON.stringify(p.discoveredSecrets),
          JSON.stringify(p.endingImplications),
          p.lastPlayed.toISOString(),
          p.totalPlayTime,
        ],
      });
    }
  }

  public async getLastSyncTimestamp(tx: Transaction): Promise<Date> {
    const result = await tx.execute("SELECT last_sync_timestamp FROM sync_status WHERE id = 1");
    if (result.rows.length === 0) {
      return new Date(0);
    }
    return new Date(result.rows[0]!.last_sync_timestamp as string);
  }

  public async updateLastSyncTimestamp(tx: Transaction) {
    await tx.execute({
      sql: `
        INSERT INTO sync_status (id, last_sync_timestamp)
        VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_sync_timestamp = excluded.last_sync_timestamp;
      `,
      args: [new Date().toISOString()],
    });
  }
}
