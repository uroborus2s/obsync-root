import { describe, expect, it, vi } from 'vitest';
import { eitherRight } from '@stratix/core/functional';
import {
  AutoSaveRepository,
  type CreateTableFromDataOptions
} from '../config/auto-save-repository.js';
import type { DatabaseConnectionProvider } from '../config/base-repository.js';

interface AutoSaveRegressionDatabase {
  users: {
    id: number;
    name: string;
  };
}

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

class AutoSaveRegressionRepository extends AutoSaveRepository<
  AutoSaveRegressionDatabase,
  'users',
  AutoSaveRegressionDatabase['users'],
  Partial<AutoSaveRegressionDatabase['users']>,
  Partial<AutoSaveRegressionDatabase['users']>
> {
  protected readonly tableName = 'users' as const;
  protected readonly logger = mockLogger as any;

  constructor(database: DatabaseConnectionProvider) {
    super({ database });
  }

  override async createMany(data: any[]): Promise<any> {
    return eitherRight(data);
  }
}

function createExistingTableProvider() {
  const tableExistsQuery = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([])
  };
  const readConnection = {
    selectFrom: vi.fn(() => tableExistsQuery)
  };
  const deleteQuery = {
    execute: vi.fn().mockResolvedValue([])
  };
  const writeConnection = {
    deleteFrom: vi.fn(() => deleteQuery)
  };
  const provider: DatabaseConnectionProvider = {
    getConnection: vi.fn(),
    getReadConnection: vi.fn().mockResolvedValue(readConnection as any),
    getWriteConnection: vi.fn().mockResolvedValue(writeConnection as any),
    getConnectionType: vi.fn()
  };

  return { provider, writeConnection, deleteQuery };
}

async function createFromData(
  options: CreateTableFromDataOptions = {}
) {
  const context = createExistingTableProvider();
  const repository = new AutoSaveRegressionRepository(context.provider);
  const result = await repository.createTableFromData(
    [{ id: 1, name: ' Alice ' }],
    options
  );

  return { ...context, result };
}

describe('AutoSaveRepository createTableFromData regressions', () => {
  it('does not clear existing table data by default', async () => {
    const { writeConnection, result } = await createFromData();

    expect(result.right).toEqual([{ id: 1, name: 'Alice' }]);
    expect(writeConnection.deleteFrom).not.toHaveBeenCalled();
  });

  it('only clears existing table data when explicitly requested', async () => {
    const { writeConnection, deleteQuery, result } = await createFromData({
      clearExistingData: true
    });

    expect(result.right).toEqual([{ id: 1, name: 'Alice' }]);
    expect(writeConnection.deleteFrom).toHaveBeenCalledWith('users');
    expect(deleteQuery.execute).toHaveBeenCalledTimes(1);
  });
});
