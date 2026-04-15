
import { TursoSync } from '../../../src/database/TursoSync';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transaction } from '@libsql/client';
import { StoryProgress } from '../../../src/types/game';
import { SQLiteStore } from '../../../src/database/SQLiteStore';
import { mockClient, mockTransaction } from './mocks/turso';

vi.mock('@libsql/client', () => ({
  Client: vi.fn(() => mockClient),
}));

describe('TursoSync', () => {
  let tursoSync: TursoSync;

  beforeEach(() => {
    const mockSqliteStore = {
      getStoryProgressSince: vi.fn().mockResolvedValue([]),
    } as unknown as SQLiteStore;
    tursoSync = new TursoSync('url', 'token', mockSqliteStore);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(TursoSync).toBeDefined();
  });

  it('should throw an error if url is not provided', () => {
    const mockSqliteStore = {
      getStoryProgressSince: vi.fn(),
    } as unknown as SQLiteStore;
    expect(() => new TursoSync('', 'token', mockSqliteStore)).toThrow('Turso URL and auth token are required.');
  });

  it('should throw an error if auth token is not provided', () => {
    const mockSqliteStore = {
      getStoryProgressSince: vi.fn(),
    } as unknown as SQLiteStore;
    expect(() => new TursoSync('url', '', mockSqliteStore)).toThrow('Turso URL and auth token are required.');
  });

  it('should call the sync method', async () => {
    mockClient.transaction.mockImplementation(async (mode, callback) => {
      if (typeof mode === 'function') {
        callback = mode;
      }
      if (callback) {
        return await callback(mockTransaction);
      }
    });
    await tursoSync.sync();
    expect(mockClient.transaction).toHaveBeenCalled();
  });

  it('should create tables', async () => {
    await tursoSync.createTables(mockTransaction as unknown as Transaction);
    expect(mockTransaction.execute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS story_progress'));
  });

  it('should sync story progress', async () => {
    const progress: StoryProgress[] = [
      {
        id: '1',
        storyId: 'story-1',
        playerId: 'player-1',
        currentBeatId: 'beat-1',
        completedBeats: [],
        visitedLocations: [],
        metCharacters: [],
        discoveredSecrets: [],
        endingImplications: {},
        lastPlayed: new Date(),
        totalPlayTime: 0,
      },
    ];
    await tursoSync.syncStoryProgress(mockTransaction as unknown as Transaction, progress);
    expect(mockTransaction.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining('INSERT INTO story_progress'),
      args: expect.any(Array),
    });
  });

  it('should get last sync timestamp', async () => {
    (mockTransaction.execute as vi.Mock).mockResolvedValue({ rows: [{ last_sync_timestamp: '2022-01-01T00:00:00.000Z' }] });
    const timestamp = await tursoSync.getLastSyncTimestamp(mockTransaction as unknown as Transaction);
    expect(timestamp).toEqual(new Date('2022-01-01T00:00:00.000Z'));
  });
});
