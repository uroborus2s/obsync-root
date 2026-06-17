import { describe, expect, it, vi } from 'vitest';
import { isLeft } from '@stratix/core/functional';

import DatabaseManager from '../database-manager.js';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('DatabaseManager health checks', () => {
  it('does not hardcode PostgreSQL information_schema for all connection types', async () => {
    const manager = new DatabaseManager(
      {
        connections: {
          sqlite: {
            type: 'sqlite',
            database: ':memory:'
          }
        }
      } as any,
      {} as any,
      mockLogger as any
    );

    const sqliteConnection = {
      executeQuery: vi.fn().mockResolvedValue({ rows: [] })
    };

    (manager as any).connections.set('sqlite', sqliteConnection);

    const result = await manager.checkAllHealth();

    expect(isLeft(result)).toBe(false);
    expect((result as any).right[0]).toMatchObject({
      healthy: true
    });
    expect(sqliteConnection.executeQuery).toHaveBeenCalledTimes(1);
    expect(sqliteConnection.executeQuery.mock.calls[0][0].sql).toBe(
      'SELECT 1 AS health'
    );
  });
});
