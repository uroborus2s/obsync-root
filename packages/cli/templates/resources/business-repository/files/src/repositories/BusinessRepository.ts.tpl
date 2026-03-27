import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';

export interface I{{pascalName}}UnitRecord {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  version: number;
  lease_owner: string | null;
  checkpoint_data: unknown | null;
  updated_at?: string | null;
}

export interface I{{pascalName}}OutboxRecord {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: string;
  created_at: string;
}

interface {{pascalName}}Database {
  {{snakeName}}_units: I{{pascalName}}UnitRecord;
  {{snakeName}}_outbox: I{{pascalName}}OutboxRecord;
}

export default class {{pascalName}}BusinessRepository extends BaseRepository<
  {{pascalName}}Database,
  '{{snakeName}}_units',
  I{{pascalName}}UnitRecord,
  Partial<I{{pascalName}}UnitRecord>,
  Partial<I{{pascalName}}UnitRecord>
> {
  protected readonly tableName = '{{snakeName}}_units' as const;
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async load{{pascalName}}BusinessModel(id: string) {
    return await this.query(async (db) => {
      return await db
        .selectFrom(this.tableName)
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
    });
  }

  async claim{{pascalName}}Work(id: string, owner: string) {
    return await this.claimById(
      id,
      {
        status: 'running',
        lease_owner: owner
      },
      {
        status: 'pending',
        lease_owner: null
      }
    );
  }

  async save{{pascalName}}Checkpoint(
    id: string,
    owner: string,
    checkpointData: unknown
  ) {
    return await this.saveCheckpointById(
      id,
      {
        checkpoint_data: checkpointData
      },
      {
        status: 'running',
        lease_owner: owner
      }
    );
  }

  async finalize{{pascalName}}Work(
    id: string,
    owner: string,
    expectedVersion: number,
    payload: Record<string, unknown>
  ) {
    return await this.tx(async (repository) => {
      const finalized = await repository.compareAndSet(
        id,
        {
          status: 'running',
          lease_owner: owner,
          version: expectedVersion
        },
        {
          status: 'completed',
          lease_owner: null,
          version: expectedVersion + 1,
          checkpoint_data: null
        }
      );

      if (finalized._tag === 'Left' || !finalized.right) {
        return false;
      }

      const db = await repository.db();
      await db
        .insertInto('{{snakeName}}_outbox')
        .values({
          id: `${id}:${expectedVersion + 1}`,
          aggregate_id: id,
          event_type: '{{pascalName}}Completed',
          payload: JSON.stringify(payload),
          created_at: new Date().toISOString()
        })
        .execute();

      return true;
    });
  }
}
