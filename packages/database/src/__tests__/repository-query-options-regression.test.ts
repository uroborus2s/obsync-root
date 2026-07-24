import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLeft } from '@stratix/core/functional';

import {
  BaseRepository,
  DataColumnType,
  type DatabaseConnectionProvider,
  type TableSchema
} from '../config/base-repository.js';

interface QueryOptionsRegressionDatabase {
  users: {
    id: number;
    name: string;
    created_at?: string;
    updated_at?: string;
  };
}

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

class QueryOptionsRegressionRepository extends BaseRepository<
  QueryOptionsRegressionDatabase,
  'users',
  QueryOptionsRegressionDatabase['users'],
  Partial<QueryOptionsRegressionDatabase['users']>,
  Partial<QueryOptionsRegressionDatabase['users']>
> {
  protected readonly tableName = 'users' as const;
  protected readonly logger = mockLogger as any;
  protected tableSchema?: TableSchema;

  constructor(database: DatabaseConnectionProvider, tableSchema?: TableSchema) {
    super({ database });
    this.tableSchema = tableSchema;
  }
}

function createDatabaseProvider(): DatabaseConnectionProvider & {
  getConnection: ReturnType<typeof vi.fn>;
  getReadConnection: ReturnType<typeof vi.fn>;
  getWriteConnection: ReturnType<typeof vi.fn>;
  getConnectionType: ReturnType<typeof vi.fn>;
} {
  return {
    getConnection: vi.fn(),
    getReadConnection: vi.fn(),
    getWriteConnection: vi.fn(),
    getConnectionType: vi.fn()
  };
}

function createSelectConnection(rows: unknown[]) {
  const query = {
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(rows)
  };
  const connection = {
    selectFrom: vi.fn(() => query)
  };

  return { connection, query };
}

function createInsertReturningConnection() {
  const payloads: Array<Record<string, unknown>> = [];
  const insertQuery = {
    values: vi.fn((payload: Record<string, unknown>) => {
      payloads.push(payload);
      return insertQuery;
    }),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn().mockImplementation(async () => ({
      id: payloads.length,
      ...payloads[payloads.length - 1]
    }))
  };
  const connection = {
    getExecutor: vi.fn(() => ({
      adapter: {
        constructor: {
          name: 'PostgresAdapter'
        }
      }
    })),
    introspection: {
      getTables: vi.fn().mockResolvedValue([])
    },
    insertInto: vi.fn(() => insertQuery)
  };

  return { connection, payloads, insertQuery };
}

describe('BaseRepository QueryOptions regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes QueryOptions.connectionName to the read connection when readonly is true', async () => {
    const databaseProvider = createDatabaseProvider();
    const { connection, query } = createSelectConnection([
      { id: 1, name: 'Alice' }
    ]);
    databaseProvider.getReadConnection.mockResolvedValue(connection as any);
    databaseProvider.getWriteConnection.mockResolvedValue({} as any);

    const repository = new QueryOptionsRegressionRepository(databaseProvider);
    const result = await repository.findAll({
      connectionName: 'analytics-replica',
      readonly: true,
      limit: 5,
      offset: 10
    });

    expect(isLeft(result)).toBe(false);
    expect(databaseProvider.getReadConnection).toHaveBeenCalledWith(
      'analytics-replica'
    );
    expect(databaseProvider.getWriteConnection).not.toHaveBeenCalled();
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.offset).toHaveBeenCalledWith(10);
  });

  it('uses QueryOptions.connectionName with a write connection when readonly is false', async () => {
    const databaseProvider = createDatabaseProvider();
    const { connection } = createSelectConnection([{ id: 1, name: 'Alice' }]);
    databaseProvider.getReadConnection.mockResolvedValue(connection as any);
    databaseProvider.getWriteConnection.mockResolvedValue(connection as any);

    const repository = new QueryOptionsRegressionRepository(databaseProvider);
    const result = await repository.findMany(undefined, {
      connectionName: 'primary-writer',
      readonly: false
    });

    expect(isLeft(result)).toBe(false);
    expect(databaseProvider.getWriteConnection).toHaveBeenCalledWith(
      'primary-writer'
    );
    expect(databaseProvider.getReadConnection).not.toHaveBeenCalled();
  });

  it('auto-populates managed string timestamps as ISO-8601 UTC strings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:34:56.789Z'));

    const databaseProvider = createDatabaseProvider();
    const { connection, payloads } = createInsertReturningConnection();
    databaseProvider.getWriteConnection.mockResolvedValue(connection as any);

    const repository = new QueryOptionsRegressionRepository(databaseProvider, {
      tableName: 'users',
      columns: [
        {
          name: 'id',
          type: DataColumnType.INTEGER,
          constraints: { primaryKey: true }
        },
        {
          name: 'name',
          type: DataColumnType.STRING
        },
        {
          name: 'created_at',
          type: DataColumnType.STRING
        },
        {
          name: 'updated_at',
          type: DataColumnType.STRING
        }
      ]
    });

    const result = await repository.create({ name: 'Alice' });

    expect(isLeft(result)).toBe(false);
    expect(payloads[0]).toMatchObject({
      created_at: '2026-06-17T12:34:56.789Z',
      updated_at: '2026-06-17T12:34:56.789Z'
    });
  });
});
