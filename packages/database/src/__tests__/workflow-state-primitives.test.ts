import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isLeft } from '@stratix/core/functional';

vi.mock('../core/database-manager.js', () => ({
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn()
}));

import { BaseRepository } from '../config/base-repository.js';
import { getWriteConnection } from '../core/database-manager.js';

interface WorkflowDatabase {
  workflow_runs: {
    id: number;
    status: string;
    lease_owner: string | null;
    checkpoint_data: string | null;
    heartbeat_at: string | null;
  };
}

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

class WorkflowRunRepository extends BaseRepository<
  WorkflowDatabase,
  'workflow_runs',
  WorkflowDatabase['workflow_runs'],
  Pick<WorkflowDatabase['workflow_runs'], 'status' | 'lease_owner'>,
  Partial<WorkflowDatabase['workflow_runs']>
> {
  protected readonly tableName = 'workflow_runs' as const;
  protected readonly logger = mockLogger as any;

  public async claimRun(id: number, owner: string) {
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

  public async renewHeartbeat(id: number, owner: string, heartbeatAt: string) {
    return await this.heartbeatById(
      id,
      {
        heartbeat_at: heartbeatAt
      },
      {
        status: 'running',
        lease_owner: owner
      }
    );
  }

  public async saveCheckpoint(id: number, owner: string, checkpoint: string) {
    return await this.saveCheckpointById(
      id,
      {
        checkpoint_data: checkpoint
      },
      {
        status: 'running',
        lease_owner: owner
      }
    );
  }

  public async claimAnyPendingRun(owner: string) {
    return await this.compareAndSetWhere(
      (qb) =>
        qb
          .where('status', '=', 'pending')
          .where('lease_owner', 'is', null),
      {},
      {
        status: 'running',
        lease_owner: owner
      }
    );
  }
}

function createUpdateChain(numUpdatedRows: number) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ numUpdatedRows })
  };
}

describe('BaseRepository durable workflow primitives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims a row by primary key with expected state guards', async () => {
    const updateChain = createUpdateChain(1);
    const writeDb = {
      updateTable: vi.fn(() => updateChain)
    };

    vi.mocked(getWriteConnection).mockResolvedValue(writeDb as any);

    const repository = new WorkflowRunRepository();
    const result = await repository.claimRun(42, 'worker-a');

    expect(isLeft(result)).toBe(false);
    expect((result as any).right).toBe(true);
    expect(writeDb.updateTable).toHaveBeenCalledWith('workflow_runs');
    expect(updateChain.set).toHaveBeenCalledWith({
      status: 'running',
      lease_owner: 'worker-a'
    });
    expect(updateChain.where.mock.calls).toEqual([
      ['id', '=', 42],
      ['status', '=', 'pending'],
      ['lease_owner', 'is', null]
    ]);
  });

  it('returns false when the guarded heartbeat update loses ownership', async () => {
    const updateChain = createUpdateChain(0);
    const writeDb = {
      updateTable: vi.fn(() => updateChain)
    };

    vi.mocked(getWriteConnection).mockResolvedValue(writeDb as any);

    const repository = new WorkflowRunRepository();
    const result = await repository.renewHeartbeat(
      42,
      'worker-a',
      '2026-03-24T12:00:00.000Z'
    );

    expect(isLeft(result)).toBe(false);
    expect((result as any).right).toBe(false);
    expect(updateChain.where.mock.calls).toEqual([
      ['id', '=', 42],
      ['status', '=', 'running'],
      ['lease_owner', '=', 'worker-a']
    ]);
  });

  it('supports checkpoint writes and non-primary-key claims with the same primitive', async () => {
    const firstUpdateChain = createUpdateChain(1);
    const secondUpdateChain = createUpdateChain(1);
    const writeDb = {
      updateTable: vi
        .fn()
        .mockReturnValueOnce(firstUpdateChain)
        .mockReturnValueOnce(secondUpdateChain)
    };

    vi.mocked(getWriteConnection).mockResolvedValue(writeDb as any);

    const repository = new WorkflowRunRepository();
    const checkpointResult = await repository.saveCheckpoint(
      7,
      'worker-b',
      '{"node":"fetch-remote"}'
    );
    const claimAnyResult = await repository.claimAnyPendingRun('worker-c');

    expect(isLeft(checkpointResult)).toBe(false);
    expect((checkpointResult as any).right).toBe(true);
    expect(firstUpdateChain.where.mock.calls).toEqual([
      ['id', '=', 7],
      ['status', '=', 'running'],
      ['lease_owner', '=', 'worker-b']
    ]);
    expect(firstUpdateChain.set).toHaveBeenCalledWith({
      checkpoint_data: '{"node":"fetch-remote"}'
    });

    expect(isLeft(claimAnyResult)).toBe(false);
    expect((claimAnyResult as any).right).toBe(true);
    expect(secondUpdateChain.where.mock.calls).toEqual([
      ['status', '=', 'pending'],
      ['lease_owner', 'is', null]
    ]);
  });
});
