/**
 * 日历权限管理集成测试
 * 测试完整的权限删除和添加流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import type { ExecutionContext } from '@stratix/tasks';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../../repositories/CalendarMapping.repository.js';

import FetchCalendarPermissionsToRemoveExecutor from '../FetchCalendarPermissionsToRemove.executor.js';
import RemoveSingleCalendarPermissionProcessor from '../RemoveSingleCalendarPermission.executor.js';
import FetchCalendarPermissionsToAddExecutor from '../FetchCalendarPermissionsToAdd.executor.js';
import AddSingleCalendarPermissionProcessor from '../AddSingleCalendarPermission.executor.js';

describe('CalendarPermissionsIntegration', () => {
  let fetchRemoveExecutor: FetchCalendarPermissionsToRemoveExecutor;
  let removeExecutor: RemoveSingleCalendarPermissionProcessor;
  let fetchAddExecutor: FetchCalendarPermissionsToAddExecutor;
  let addExecutor: AddSingleCalendarPermissionProcessor;

  let mockDatabaseApi: jest.Mocked<DatabaseAPI>;
  let mockCalendarMappingRepository: jest.Mocked<ICalendarMappingRepository>;
  let mockWpsCalendarAdapter: jest.Mocked<WpsCalendarAdapter>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockDatabaseApi = {
      executeQuery: vi.fn()
    } as any;

    mockCalendarMappingRepository = {
      findByKkh: vi.fn()
    } as any;

    mockWpsCalendarAdapter = {
      getCalendarPermissionList: vi.fn(),
      deleteCalendarPermission: vi.fn(),
      batchCreateCalendarPermissions: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    // 初始化执行器
    fetchRemoveExecutor = new FetchCalendarPermissionsToRemoveExecutor(
      mockDatabaseApi,
      mockLogger
    );

    removeExecutor = new RemoveSingleCalendarPermissionProcessor(
      mockCalendarMappingRepository,
      mockWpsCalendarAdapter,
      mockLogger
    );

    fetchAddExecutor = new FetchCalendarPermissionsToAddExecutor(
      mockDatabaseApi,
      mockLogger
    );

    addExecutor = new AddSingleCalendarPermissionProcessor(
      mockCalendarMappingRepository,
      mockWpsCalendarAdapter,
      mockLogger
    );
  });

  describe('完整的权限管理流程', () => {
    it('应该完成完整的权限删除和添加流程', async () => {
      // 1. 模拟获取需要删除权限的用户信息
      mockDatabaseApi.executeQuery
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              kkh: 'TEST001',
              merged_user_list: '2021001, 2021002, T001'
            }
          ]
        })
        // 2. 模拟获取需要添加权限的用户信息
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              kkh: 'TEST001',
              merged_user_list: '2021003, 2021004, T002, T003'
            }
          ]
        });

      // 模拟日历映射查询
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'cal-123',
          xnxq: '2023-2024-1',
          calendar_name: 'Test Calendar',
          is_deleted: false,
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: null
        }
      });

      // 模拟权限列表查询
      mockWpsCalendarAdapter.getCalendarPermissionList.mockResolvedValue({
        items: [
          {
            id: 'perm-1',
            calendar_id: 'cal-123',
            user_id: '2021001',
            role: 'reader'
          },
          {
            id: 'perm-2',
            calendar_id: 'cal-123',
            user_id: 'T001',
            role: 'writer'
          }
        ],
        next_page_token: undefined,
        total_count: 2
      });

      // 模拟删除权限
      mockWpsCalendarAdapter.deleteCalendarPermission.mockResolvedValue();

      // 模拟批量添加权限
      mockWpsCalendarAdapter.batchCreateCalendarPermissions.mockResolvedValue({
        data: {
          created_permissions: []
        },
        code: 0,
        msg: 'success'
      } as any);

      // 执行完整流程
      const xnxq = '2023-2024-1';

      // 步骤1: 获取需要删除权限的用户信息
      const fetchRemoveResult = await fetchRemoveExecutor.execute({
        config: { xnxq }
      });

      expect(fetchRemoveResult.success).toBe(true);
      expect(fetchRemoveResult.data.permissionsToRemove).toHaveLength(1);

      // 步骤2: 删除权限
      const removeResult = await removeExecutor.execute({
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, 2021002, T001',
          dryRun: false
        }
      });

      expect(removeResult.success).toBe(true);
      expect(removeResult.data.successCount).toBe(2); // 只有2个用户在权限列表中

      // 步骤3: 获取需要添加权限的用户信息
      const fetchAddResult = await fetchAddExecutor.execute({
        config: { xnxq, batchSize: 100 }
      });

      expect(fetchAddResult.success).toBe(true);
      expect(fetchAddResult.data.permissionsToAdd).toHaveLength(1);

      // 步骤4: 添加权限
      const addResult = await addExecutor.execute({
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021003, 2021004, T002, T003',
          batch_size: 100,
          dryRun: false
        }
      });

      expect(addResult.success).toBe(true);
      expect(addResult.data.totalSuccessCount).toBe(4);

      // 验证API调用次数
      expect(mockWpsCalendarAdapter.deleteCalendarPermission).toHaveBeenCalledTimes(2);
      expect(mockWpsCalendarAdapter.batchCreateCalendarPermissions).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理大批量用户的分组', async () => {
      // 创建150个用户的列表
      const largeUserList = Array.from({ length: 150 }, (_, i) => `user${i + 1}`).join(', ');

      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: true,
        data: [
          {
            kkh: 'TEST001',
            merged_user_list: largeUserList
          }
        ]
      });

      // 获取需要添加权限的用户信息（分组处理）
      const fetchAddResult = await fetchAddExecutor.execute({
        config: { xnxq: '2023-2024-1', batchSize: 100 }
      });

      expect(fetchAddResult.success).toBe(true);
      expect(fetchAddResult.data.permissionsToAdd).toHaveLength(2); // 150个用户分成2个批次
      expect(fetchAddResult.data.totalBatches).toBe(2);
      expect(fetchAddResult.data.totalUsers).toBe(150);

      // 验证分组信息
      const firstBatch = fetchAddResult.data.permissionsToAdd[0];
      const secondBatch = fetchAddResult.data.permissionsToAdd[1];

      expect(firstBatch.batch_info.batchNumber).toBe(1);
      expect(firstBatch.batch_info.userCount).toBe(100);
      expect(firstBatch.batch_info.totalBatches).toBe(2);

      expect(secondBatch.batch_info.batchNumber).toBe(2);
      expect(secondBatch.batch_info.userCount).toBe(50);
      expect(secondBatch.batch_info.totalBatches).toBe(2);
    });

    it('应该在DryRun模式下正确模拟操作', async () => {
      // 设置基本的mock
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: true,
        data: [
          {
            kkh: 'TEST001',
            merged_user_list: '2021001, T001'
          }
        ]
      });

      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'cal-123',
          xnxq: '2023-2024-1',
          calendar_name: 'Test Calendar',
          is_deleted: false,
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: null
        }
      });

      mockWpsCalendarAdapter.getCalendarPermissionList.mockResolvedValue({
        items: [
          {
            id: 'perm-1',
            calendar_id: 'cal-123',
            user_id: '2021001',
            role: 'reader'
          }
        ],
        next_page_token: undefined,
        total_count: 1
      });

      // DryRun模式删除权限
      const removeResult = await removeExecutor.execute({
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, T001',
          dryRun: true
        }
      });

      expect(removeResult.success).toBe(true);
      expect(removeResult.data.dryRun).toBe(true);
      expect(mockWpsCalendarAdapter.deleteCalendarPermission).not.toHaveBeenCalled();

      // DryRun模式添加权限
      const addResult = await addExecutor.execute({
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, T001',
          dryRun: true
        }
      });

      expect(addResult.success).toBe(true);
      expect(addResult.data.dryRun).toBe(true);
      expect(mockWpsCalendarAdapter.batchCreateCalendarPermissions).not.toHaveBeenCalled();
    });
  });

  describe('错误处理集成测试', () => {
    it('应该正确处理数据库查询失败', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: false,
        error: { message: 'Database connection failed' }
      });

      const fetchRemoveResult = await fetchRemoveExecutor.execute({
        config: { xnxq: '2023-2024-1' }
      });

      const fetchAddResult = await fetchAddExecutor.execute({
        config: { xnxq: '2023-2024-1' }
      });

      expect(fetchRemoveResult.success).toBe(false);
      expect(fetchAddResult.success).toBe(false);
    });

    it('应该正确处理日历映射不存在', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: null
      });

      const removeResult = await removeExecutor.execute({
        config: {
          kkh: 'NONEXISTENT',
          merged_user_list: '2021001',
          dryRun: false
        }
      });

      const addResult = await addExecutor.execute({
        config: {
          kkh: 'NONEXISTENT',
          merged_user_list: '2021001',
          dryRun: false
        }
      });

      expect(removeResult.success).toBe(false);
      expect(addResult.success).toBe(false);
    });
  });
});
