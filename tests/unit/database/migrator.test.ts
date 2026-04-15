
import { Migrator } from '../../../src/database/Migrator';
import { SQLiteStore } from '../../../src/database/SQLiteStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('fs');
vi.mock('path');

describe('Migrator', () => {
  let migrator: Migrator;
  let sqliteStore: any;

  beforeEach(() => {
    sqliteStore = {
      transaction: vi.fn((callback) => callback()),
      db: {
        prepare: vi.fn(() => ({
          all: vi.fn(() => []),
          run: vi.fn(),
        })),
        exec: vi.fn(),
      },
    };
    migrator = new Migrator(sqliteStore);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Migrator).toBeDefined();
  });

  it('should apply migrations', async () => {
    const migrations = ['001-initial.sql', '002-add-users.sql'];
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(migrations as any);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('SQL');
    vi.spyOn(path, 'join').mockReturnValue('path');

    await migrator.migrate();

    expect(fs.readdirSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    expect(sqliteStore.transaction).toHaveBeenCalledTimes(3);
  });
});
