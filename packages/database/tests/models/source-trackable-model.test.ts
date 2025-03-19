/**
 * SourceTrackableModel 测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseManager } from '../../src/lib/database-manager.js';
import { ModelRegistry } from '../../src/lib/model-registry.js';
import {
  SourceTrackableModel,
  SyncStatus
} from '../../src/models/source-trackable-model.js';

// 测试模型类
class TestSourceModel extends SourceTrackableModel {
  static tableName = 'test_sources';

  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    source: { type: 'string' },
    source_id: { type: 'string' },
    source_updated_at: { type: 'datetime' },
    source_data: { type: 'text' },
    sync_status: { type: 'string', defaultTo: SyncStatus.PENDING }
  };

  // 自定义转换方法
  static transformSourceData(sourceData: any): Record<string, any> {
    return {
      name: sourceData.name || sourceData.title,
      description: sourceData.description || sourceData.content
    };
  }
}

describe('SourceTrackableModel', () => {
  let dbManager: DatabaseManager;
  let mockKnex: any;
  let mockTransaction: any;

  beforeEach(() => {
    // 模拟数据库连接和事务
    mockTransaction = vi
      .fn()
      .mockImplementation((callback) => callback(mockTransaction));

    mockKnex = {
      transaction: mockTransaction,
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      whereNull: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue([1]),
      update: vi.fn().mockResolvedValue(1),
      returning: vi.fn().mockReturnThis()
    };

    // 初始化数据库管理器
    dbManager = new DatabaseManager();

    // 创建 Database 实例并注册
    dbManager.registerConnection('default', { client: mockKnex } as any);

    // 设置数据库管理器
    TestSourceModel.setDatabaseManager(dbManager);

    // 注册模型
    ModelRegistry.register(TestSourceModel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('syncFromSource', () => {
    it('应该从源数据创建新记录', async () => {
      // 模拟源数据
      const sourceData = {
        id: 'src-123',
        name: '测试源',
        description: '这是一个测试源',
        updated_at: new Date()
      };

      // 模拟 findBy 返回 null（没有找到现有记录）
      mockKnex.first.mockResolvedValueOnce(null);

      // 模拟 insert 返回新记录的 ID
      mockKnex.insert.mockResolvedValueOnce([1]);

      // 模拟 select 返回新创建的记录
      mockKnex.first.mockResolvedValueOnce({
        id: 1,
        name: '测试源',
        description: '这是一个测试源',
        source: 'test-source',
        source_id: 'src-123',
        source_updated_at: sourceData.updated_at,
        source_data: JSON.stringify(sourceData),
        sync_status: SyncStatus.SYNCED
      });

      // 调用同步方法
      const result = await TestSourceModel.syncFromSource(
        sourceData,
        'test-source'
      );

      // 验证结果
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe('测试源');
      expect(result.source).toBe('test-source');
      expect(result.source_id).toBe('src-123');

      // 验证 findBy 被调用
      expect(mockKnex.where).toHaveBeenCalledWith('source', 'test-source');
      expect(mockKnex.where).toHaveBeenCalledWith('source_id', 'src-123');

      // 验证 insert 被调用
      expect(mockKnex.insert).toHaveBeenCalled();
    });

    it('应该更新现有记录', async () => {
      // 模拟源数据
      const sourceData = {
        id: 'src-123',
        name: '更新的测试源',
        description: '这是一个更新的测试源',
        updated_at: new Date()
      };

      // 模拟现有记录
      const existingRecord = {
        id: 1,
        name: '测试源',
        description: '这是一个测试源',
        source: 'test-source',
        source_id: 'src-123',
        source_updated_at: new Date(Date.now() - 86400000), // 一天前
        source_data: JSON.stringify({
          id: 'src-123',
          name: '测试源',
          description: '这是一个测试源'
        }),
        sync_status: SyncStatus.SYNCED
      };

      // 模拟 findBy 返回现有记录
      mockKnex.first.mockResolvedValueOnce(existingRecord);

      // 模拟 update 返回更新的行数
      mockKnex.update.mockResolvedValueOnce(1);

      // 模拟 select 返回更新后的记录
      mockKnex.first.mockResolvedValueOnce({
        ...existingRecord,
        name: '更新的测试源',
        description: '这是一个更新的测试源',
        source_updated_at: sourceData.updated_at,
        source_data: JSON.stringify(sourceData)
      });

      // 调用同步方法
      const result = await TestSourceModel.syncFromSource(
        sourceData,
        'test-source'
      );

      // 验证结果
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe('更新的测试源');

      // 验证 update 被调用
      expect(mockKnex.update).toHaveBeenCalled();
    });

    it('应该处理同步错误', async () => {
      // 模拟源数据
      const sourceData = {
        id: 'src-123',
        name: '测试源',
        description: '这是一个测试源'
      };

      // 模拟错误
      const error = new Error('同步失败');
      mockKnex.first.mockRejectedValueOnce(error);

      // 模拟错误处理钩子
      const onSyncErrorMock = vi.fn();
      TestSourceModel.hooks = {
        onSyncError: onSyncErrorMock
      };

      // 调用同步方法并捕获错误
      await expect(
        TestSourceModel.syncFromSource(sourceData, 'test-source')
      ).rejects.toThrow('同步失败');

      // 验证错误处理钩子被调用
      expect(onSyncErrorMock).toHaveBeenCalledWith(
        error,
        sourceData,
        'test-source'
      );
    });
  });

  describe('syncBatchFromSource', () => {
    it('应该批量同步源数据', async () => {
      // 模拟源数据数组
      const sourceDataArray = [
        {
          id: 'src-123',
          name: '测试源1',
          description: '这是测试源1'
        },
        {
          id: 'src-456',
          name: '测试源2',
          description: '这是测试源2'
        }
      ];

      // 模拟 syncFromSource 方法
      const syncFromSourceSpy = vi
        .spyOn(TestSourceModel, 'syncFromSource')
        .mockResolvedValueOnce(new TestSourceModel({ id: 1, name: '测试源1' }))
        .mockResolvedValueOnce(new TestSourceModel({ id: 2, name: '测试源2' }));

      // 调用批量同步方法
      const results = await TestSourceModel.syncBatchFromSource(
        sourceDataArray,
        'test-source'
      );

      // 验证结果
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);

      // 验证事务被使用
      expect(mockTransaction).toHaveBeenCalled();

      // 验证 syncFromSource 被调用了两次
      expect(syncFromSourceSpy).toHaveBeenCalledTimes(2);
      expect(syncFromSourceSpy).toHaveBeenCalledWith(
        sourceDataArray[0],
        'test-source',
        expect.any(Object)
      );
      expect(syncFromSourceSpy).toHaveBeenCalledWith(
        sourceDataArray[1],
        'test-source',
        expect.any(Object)
      );

      // 恢复原始方法
      syncFromSourceSpy.mockRestore();
    });
  });
});
