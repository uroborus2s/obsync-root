import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isLeft } from '@stratix/core/functional';

vi.mock('../core/database-manager.js', () => ({
  getConnectionType: vi.fn(),
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn()
}));

import {
  BaseRepository,
  DatabaseType,
  DataColumnType,
  QueryHelpers,
  TableCreator,
  type TableSchema
} from '../config/base-repository.js';
import {
  getConnectionType,
  getReadConnection,
  getWriteConnection
} from '../core/database-manager.js';

interface RepositoryCreateDatabase {
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

class RepositoryWithSchema extends BaseRepository<
  RepositoryCreateDatabase,
  'users',
  RepositoryCreateDatabase['users'],
  Partial<RepositoryCreateDatabase['users']>,
  Partial<RepositoryCreateDatabase['users']>
> {
  protected readonly tableName = 'users' as const;
  protected readonly logger = mockLogger as any;
  protected tableSchema: TableSchema;

  constructor(schema: TableSchema) {
    super();
    this.tableSchema = schema;
  }

  protected getCurrentTimestamp(): string {
    return '2026-03-25T04:00:00.000Z';
  }

  public getSchemaSnapshot(): TableSchema | undefined {
    return this.tableSchema;
  }
}

class RepositoryWithoutSchema extends BaseRepository<
  RepositoryCreateDatabase,
  'users',
  RepositoryCreateDatabase['users'],
  Partial<RepositoryCreateDatabase['users']>,
  Partial<RepositoryCreateDatabase['users']>
> {
  protected readonly tableName = 'users' as const;
  protected readonly logger = mockLogger as any;

  constructor() {
    super();
  }

  public getSchemaSnapshot(): TableSchema | undefined {
    return this.tableSchema;
  }
}

function createSingleInsertReturningConnection(
  adapterName: string,
  introspectedTables?: any[]
) {
  const payloads: any[] = [];
  const insertChains: any[] = [];

  const connection = {
    getExecutor: vi.fn(() => ({
      adapter: {
        constructor: {
          name: adapterName
        }
      }
    })),
    introspection: {
      getTables: vi.fn().mockResolvedValue(introspectedTables || [])
    },
    insertInto: vi.fn(() => {
      const chain = {
        values: vi.fn((payload: any) => {
          payloads.push(payload);
          return chain;
        }),
        returningAll: vi.fn().mockReturnThis(),
        outputAll: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn().mockImplementation(async () => ({
          id: payloads.length,
          ...payloads[payloads.length - 1]
        }))
      };

      insertChains.push(chain);
      return chain;
    })
  };

  return {
    connection,
    payloads,
    insertChains
  };
}

function createManyReturningConnection(adapterName: string) {
  const payloads: any[][] = [];
  const insertChains: any[] = [];

  const connection = {
    getExecutor: vi.fn(() => ({
      adapter: {
        constructor: {
          name: adapterName
        }
      }
    })),
    insertInto: vi.fn(() => {
      const chain = {
        values: vi.fn((payload: any[]) => {
          payloads.push(payload);
          return chain;
        }),
        returningAll: vi.fn().mockReturnThis(),
        outputAll: vi.fn().mockReturnThis(),
        execute: vi.fn().mockImplementation(async () =>
          (payloads[payloads.length - 1] || []).map((item, index) => ({
            id: index + 1,
            ...item
          }))
        )
      };

      insertChains.push(chain);
      return chain;
    })
  };

  return {
    connection,
    payloads,
    insertChains
  };
}

function createMysqlConnection(rowsById: Record<number, any>) {
  const payloads: any[] = [];
  const insertChains: any[] = [];
  const selectChains: any[] = [];
  let insertId = 0;

  const connection = {
    getExecutor: vi.fn(() => ({
      adapter: {
        constructor: {
          name: 'MysqlAdapter'
        }
      }
    })),
    insertInto: vi.fn(() => {
      const chain = {
        values: vi.fn((payload: any) => {
          payloads.push(payload);
          return chain;
        }),
        executeTakeFirstOrThrow: vi.fn().mockImplementation(async () => {
          insertId += 1;
          return { insertId };
        })
      };

      insertChains.push(chain);
      return chain;
    }),
    selectFrom: vi.fn(() => {
      let selectedId: number | undefined;
      const chain = {
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn((field: string, operator: string, value: number) => {
          expect(field).toBe('id');
          expect(operator).toBe('=');
          selectedId = value;
          return chain;
        }),
        executeTakeFirstOrThrow: vi.fn().mockImplementation(async () => {
          return rowsById[selectedId || 0];
        })
      };

      selectChains.push(chain);
      return chain;
    })
  };

  return {
    connection,
    payloads,
    insertChains,
    selectChains
  };
}

function createUpdateConnection(updatedRow: any) {
  const updateBuilder = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
  };

  const selectBuilder = {
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(updatedRow)
  };

  return {
    introspection: {
      getTables: vi.fn().mockResolvedValue([])
    },
    updateTable: vi.fn(() => updateBuilder),
    selectFrom: vi.fn(() => selectBuilder)
  };
}

function createDeleteConnection(existingRow: any) {
  const selectBuilder = {
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(existingRow)
  };

  const deleteBuilder = {
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ numDeletedRows: 1 })
  };

  return {
    selectFrom: vi.fn(() => selectBuilder),
    deleteFrom: vi.fn(() => deleteBuilder)
  };
}

describe('BaseRepository create behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConnectionType).mockReturnValue(undefined);
  });

  it('does not auto mutate schema timestamps during onReady when no timestamp columns are declared', async () => {
    vi.mocked(getWriteConnection).mockResolvedValue({
      introspection: {
        getTables: vi.fn().mockResolvedValue([])
      }
    } as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    await repository.onReady();

    expect(repository.getSchemaSnapshot()?.columns.map((column) => column.name)).toEqual([
      'id',
      'name'
    ]);
    expect(vi.mocked(getWriteConnection)).toHaveBeenCalledTimes(1);
  });

  it('hydrates this.tableSchema from the live table during onReady even without declared schema', async () => {
    vi.mocked(getWriteConnection).mockResolvedValue({
      introspection: {
        getTables: vi.fn().mockResolvedValue([
          {
            name: 'users',
            isView: false,
            columns: [
              {
                name: 'id',
                dataType: 'int4',
                isNullable: false,
                isAutoIncrementing: true,
                hasDefaultValue: true
              },
              {
                name: 'name',
                dataType: 'varchar',
                isNullable: false,
                isAutoIncrementing: false,
                hasDefaultValue: false
              },
              {
                name: 'created_at',
                dataType: 'text',
                isNullable: false,
                isAutoIncrementing: false,
                hasDefaultValue: false
              }
            ]
          }
        ])
      }
    } as any);

    const repository = new RepositoryWithoutSchema();

    await repository.onReady();

    expect(repository.getSchemaSnapshot()?.columns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'created_at'
    ]);
    expect(repository.getSchemaSnapshot()?.columns.find((column) => column.name === 'created_at')?.type).toBe(
      DataColumnType.TEXT
    );
  });

  it('auto writes string timestamps on create and preserves explicitly provided values', async () => {
    const { connection, payloads } = createSingleInsertReturningConnection(
      'PostgresAdapter'
    );

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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

    const created = await repository.create({ name: 'Alice' });
    const customCreatedAt = '2026-03-01T08:00:00.000Z';
    const customUpdatedAt = '2026-03-01T09:00:00.000Z';
    const createdWithExplicitTimestamps = await repository.create({
      name: 'Bob',
      created_at: customCreatedAt,
      updated_at: customUpdatedAt
    });

    expect(isLeft(created)).toBe(false);
    expect(isLeft(createdWithExplicitTimestamps)).toBe(false);
    expect(payloads[0]).toMatchObject({
      name: 'Alice',
      created_at: '2026-03-25T04:00:00.000Z',
      updated_at: '2026-03-25T04:00:00.000Z'
    });
    expect(payloads[1]).toMatchObject({
      name: 'Bob',
      created_at: customCreatedAt,
      updated_at: customUpdatedAt
    });
  });

  it('does not auto write timestamps when timestamp columns are not string compatible', async () => {
    const { connection, payloads } = createSingleInsertReturningConnection(
      'PostgresAdapter'
    );

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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
          type: DataColumnType.TIMESTAMP
        },
        {
          name: 'updated_at',
          type: DataColumnType.DATETIME
        }
      ]
    });

    const created = await repository.create({ name: 'Alice' });

    expect(isLeft(created)).toBe(false);
    expect(payloads[0]).toEqual({
      name: 'Alice'
    });
  });

  it('prefers live database schema over declared in-memory schema for timestamp decisions', async () => {
    const { connection, payloads } = createSingleInsertReturningConnection(
      'PostgresAdapter',
      [
        {
          name: 'users',
          isView: false,
          columns: [
            {
              name: 'id',
              dataType: 'int4',
              isNullable: false,
              isAutoIncrementing: true,
              hasDefaultValue: true
            },
            {
              name: 'name',
              dataType: 'varchar',
              isNullable: false,
              isAutoIncrementing: false,
              hasDefaultValue: false
            },
            {
              name: 'created_at',
              dataType: 'timestamp',
              isNullable: false,
              isAutoIncrementing: false,
              hasDefaultValue: true
            },
            {
              name: 'updated_at',
              dataType: 'timestamp',
              isNullable: true,
              isAutoIncrementing: false,
              hasDefaultValue: true
            }
          ]
        }
      ]
    );

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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

    const created = await repository.create({ name: 'Alice' });

    expect(isLeft(created)).toBe(false);
    expect(payloads[0]).toEqual({ name: 'Alice' });
    expect(repository.getSchemaSnapshot()?.columns.find((column) => column.name === 'created_at')?.type).toBe(
      DataColumnType.TIMESTAMP
    );
  });

  it('hydrates missing timestamp columns from live database schema and uses them as truth', async () => {
    const { connection, payloads } = createSingleInsertReturningConnection(
      'PostgresAdapter',
      [
        {
          name: 'users',
          isView: false,
          columns: [
            {
              name: 'id',
              dataType: 'int4',
              isNullable: false,
              isAutoIncrementing: true,
              hasDefaultValue: true
            },
            {
              name: 'name',
              dataType: 'varchar',
              isNullable: false,
              isAutoIncrementing: false,
              hasDefaultValue: false
            },
            {
              name: 'created_at',
              dataType: 'text',
              isNullable: false,
              isAutoIncrementing: false,
              hasDefaultValue: false
            },
            {
              name: 'updated_at',
              dataType: 'text',
              isNullable: true,
              isAutoIncrementing: false,
              hasDefaultValue: false
            }
          ]
        }
      ]
    );

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    const created = await repository.create({ name: 'Alice' });

    expect(isLeft(created)).toBe(false);
    expect(payloads[0]).toMatchObject({
      name: 'Alice',
      created_at: '2026-03-25T04:00:00.000Z',
      updated_at: '2026-03-25T04:00:00.000Z'
    });
    expect(repository.getSchemaSnapshot()?.columns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'created_at',
      'updated_at'
    ]);
  });

  it('uses returning-all on PostgreSQL create and avoids fallback re-query', async () => {
    const { connection, insertChains } = createSingleInsertReturningConnection(
      'PostgresAdapter'
    );

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    const created = await repository.create({ name: 'Alice' });

    expect(isLeft(created)).toBe(false);
    expect(insertChains[0].returningAll).toHaveBeenCalledTimes(1);
    expect((connection as any).selectFrom).toBeUndefined();
  });

  it('uses OUTPUT INSERTED on MSSQL create', async () => {
    const { connection, insertChains } = createSingleInsertReturningConnection(
      'MSSQLAdapter'
    );

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    const created = await repository.create({ name: 'Alice' });

    expect(isLeft(created)).toBe(false);
    expect(insertChains[0].outputAll).toHaveBeenCalledWith('inserted');
  });

  it('falls back to insertId re-query for MySQL create and sequential createMany', async () => {
    const { connection, payloads, insertChains, selectChains } =
      createMysqlConnection({
        1: { id: 1, name: 'Alice' },
        2: { id: 2, name: 'Bob' },
        3: { id: 3, name: 'Carol' }
      });

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    const created = await repository.create({ name: 'Alice' });
    const createdMany = await repository.createMany([
      { name: 'Bob' },
      { name: 'Carol' }
    ]);

    expect(isLeft(created)).toBe(false);
    expect(isLeft(createdMany)).toBe(false);
    expect(insertChains).toHaveLength(3);
    expect(selectChains).toHaveLength(3);
    expect(payloads).toEqual([
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Carol' }
    ]);
    expect((createdMany as any).right).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Carol' }
    ]);
  });

  it('uses a single returning insert for PostgreSQL createMany', async () => {
    const { connection, payloads, insertChains } =
      createManyReturningConnection('PostgresAdapter');

    vi.mocked(getWriteConnection).mockResolvedValue(connection as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    const created = await repository.createMany([
      { name: 'Alice' },
      { name: 'Bob' }
    ]);

    expect(isLeft(created)).toBe(false);
    expect(insertChains).toHaveLength(1);
    expect(insertChains[0].returningAll).toHaveBeenCalledTimes(1);
    expect(payloads[0]).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
    expect((created as any).right).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
  });

  it('updates and reads back using the write connection', async () => {
    const writeConnection = createUpdateConnection({ id: 1, name: 'Alice v2' });

    vi.mocked(getWriteConnection).mockResolvedValue(writeConnection as any);
    vi.mocked(getReadConnection).mockResolvedValue({
      selectFrom: vi.fn()
    } as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    const updated = await repository.update(1, { name: 'Alice v2' });

    expect(isLeft(updated)).toBe(false);
    expect(vi.mocked(getReadConnection)).not.toHaveBeenCalled();
    expect(writeConnection.selectFrom).toHaveBeenCalledWith('users');
    expect((updated as any).right).toEqual({ id: 1, name: 'Alice v2' });
  });

  it('deletes using a preloaded record from the write connection', async () => {
    const writeConnection = createDeleteConnection({ id: 1, name: 'Alice' });

    vi.mocked(getWriteConnection).mockResolvedValue(writeConnection as any);
    vi.mocked(getReadConnection).mockResolvedValue({
      selectFrom: vi.fn()
    } as any);

    const repository = new RepositoryWithSchema({
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
        }
      ]
    });

    const deleted = await repository.delete(1);

    expect(isLeft(deleted)).toBe(false);
    expect(vi.mocked(getReadConnection)).not.toHaveBeenCalled();
    expect(writeConnection.selectFrom).toHaveBeenCalledWith('users');
    expect((deleted as any).right).toEqual({ id: 1, name: 'Alice' });
  });

  it('prefers configured connection metadata over adapter constructor names for database type', () => {
    vi.mocked(getConnectionType).mockReturnValue('mysql');

    const connection = {
      getExecutor: vi.fn(() => ({
        adapter: {
          constructor: {
            name: 'DefinitelyNotMysqlAdapter'
          }
        }
      }))
    };

    expect(TableCreator.getDatabaseType(connection as any, 'default')).toBe(
      DatabaseType.MYSQL
    );
  });

  it('passes supported partial-index expressions to Kysely createIndex.where', async () => {
    const whereFactory = vi.fn((eb: any) => eb('deleted_at', 'is', null));
    const indexBuilder = {
      ifNotExists: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      columns: vi.fn().mockReturnThis(),
      unique: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined)
    };
    const connection = {
      schema: {
        createIndex: vi.fn(() => indexBuilder)
      }
    };

    await (TableCreator as any).createIndexes(connection, 'users', [
      {
        name: 'idx_users_active',
        columns: ['name'],
        where: whereFactory
      }
    ]);

    expect(indexBuilder.where).toHaveBeenCalledWith(whereFactory);
  });

  it('builds OR predicates from expression factories instead of query-builder callbacks', () => {
    const firstExpression = { kind: 'first' };
    const secondExpression = { kind: 'second' };
    const fakeEb = {
      or: vi.fn((expressions: unknown[]) => ({ expressions }))
    };
    const qb = {
      where: vi.fn((factory: (eb: typeof fakeEb) => unknown) => factory(fakeEb))
    };

    const condition = QueryHelpers.or<any, 'users'>(
      () => firstExpression as any,
      () => secondExpression as any
    );
    const result = condition(qb as any);

    expect(fakeEb.or).toHaveBeenCalledWith([firstExpression, secondExpression]);
    expect(result).toEqual({ expressions: [firstExpression, secondExpression] });
  });

  it('turns whereIn with an empty array into a false predicate instead of invalid IN () SQL', () => {
    const qb = {
      where: vi.fn((...args: unknown[]) => args)
    };

    const result = QueryHelpers.whereIn<any, 'users'>('id', [])(qb as any);

    expect(qb.where).toHaveBeenCalledTimes(1);
    expect(qb.where).toHaveBeenCalledWith(expect.anything());
    expect(result).toHaveLength(1);
  });

  it('keeps QueryHelpers.or empty-input semantics aligned with Kysely false-expression behavior', () => {
    const fakeEb = {
      or: vi.fn((expressions: unknown[]) => ({ expressions }))
    };
    const qb = {
      where: vi.fn((factory: (eb: typeof fakeEb) => unknown) => factory(fakeEb))
    };

    const result = QueryHelpers.or<any, 'users'>()(qb as any);

    expect(qb.where).toHaveBeenCalledTimes(1);
    expect(fakeEb.or).toHaveBeenCalledWith([]);
    expect(result).toEqual({ expressions: [] });
  });
});
