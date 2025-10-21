/**
 * AddSingleCalendarPermissionProcessor 测试
 */

import type { ExecutionContext } from '@stratix/tasks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddSingleCalendarPermissionProcessor from '../AddSingleCalendarPermissionProcessor.js';

describe('AddSingleCalendarPermissionProcessor', () => {
  let executor: AddSingleCalendarPermissionProcessor;
  let mockCalendarMappingRepository: any;
  let mockWpsCalendarAdapter: any;
  let mockPermissionStatusRepository: any;
  let mockLogger: any;
  let mockWpsUserAdapter: any;

  beforeEach(() => {
    mockCalendarMappingRepository = {
      findByKkh: vi.fn()
    } as any;

    mockWpsCalendarAdapter = {
      batchCreateCalendarPermissions: vi.fn(),
      batchCreateCalendarPermissionsLimit: vi.fn()
    } as any;

    mockPermissionStatusRepository = {
      updatePermissionStatus: vi.fn(),
      updateStudentCourseStatus: vi.fn(),
      updateTeacherCourseStatus: vi.fn()
    } as any;

    mockWpsUserAdapter = {
      getUsersByExUserIds: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    executor = new AddSingleCalendarPermissionProcessor(
      mockCalendarMappingRepository,
      mockWpsCalendarAdapter,
      mockPermissionStatusRepository,
      mockLogger,
      mockWpsUserAdapter
    );
  });

  describe('execute', () => {
    it('应该成功添加日历权限', async () => {
      // Mock 日历映射查询
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

      // Mock 批量添加权限
      mockWpsCalendarAdapter.batchCreateCalendarPermissions.mockResolvedValue({
        data: {
          created_permissions: []
        },
        code: 0,
        msg: 'success'
      } as any);

      const context = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, 2021002, T001, T002',
          batch_size: 100,
          dryRun: false
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.kkh).toBe('TEST001');
      expect(result.data.calendarId).toBe('cal-123');
      expect(result.data.totalSuccessCount).toBe(4);
      expect(result.data.totalFailureCount).toBe(0);
      expect(result.data.batchCount).toBe(1);
      expect(
        mockWpsCalendarAdapter.batchCreateCalendarPermissions
      ).toHaveBeenCalledTimes(1);
    });

    it('应该在权限添加成功后更新原始数据状态', async () => {
      // Mock 日历映射查询
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

      // Mock 批量添加权限
      mockWpsCalendarAdapter.batchCreateCalendarPermissions.mockResolvedValue({
        data: {
          created_permissions: []
        },
        code: 0,
        msg: 'success'
      } as any);

      // Mock 状态更新
      mockPermissionStatusRepository.updatePermissionStatus.mockResolvedValue({
        success: true,
        data: {
          studentUpdateCount: 2,
          teacherUpdateCount: 1,
          totalUpdateCount: 3,
          updateTime: '2023-01-01 12:00:00'
        }
      });

      const context = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, 2021002, T001',
          batch_size: 100,
          dryRun: false,
          xnxq: '2023-2024-1'
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.statusUpdateResult).toBeDefined();
      expect(result.data.statusUpdateResult?.studentUpdateCount).toBe(2);
      expect(result.data.statusUpdateResult?.teacherUpdateCount).toBe(1);
      expect(result.data.statusUpdateResult?.totalUpdateCount).toBe(3);

      expect(
        mockPermissionStatusRepository.updatePermissionStatus
      ).toHaveBeenCalledWith({
        kkh: 'TEST001',
        xnxq: '2023-2024-1',
        gxZt: '3',
        userIds: ['2021001', '2021002', 'T001']
      });
    });

    it('应该在DryRun模式下跳过状态更新', async () => {
      // Mock 日历映射查询
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

      const context = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, T001',
          dryRun: true,
          xnxq: '2023-2024-1'
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.dryRun).toBe(true);
      expect(result.data.statusUpdateResult).toBeUndefined();
      expect(
        mockPermissionStatusRepository.updatePermissionStatus
      ).not.toHaveBeenCalled();
    });

    it('应该正确处理大批量用户分组', async () => {
      // Mock 日历映射查询
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

      // Mock 批量添加权限
      mockWpsCalendarAdapter.batchCreateCalendarPermissions.mockResolvedValue({
        data: {
          created_permissions: []
        },
        code: 0,
        msg: 'success'
      } as any);

      // 创建150个用户的列表
      const userList = Array.from(
        { length: 150 },
        (_, i) => `user${i + 1}`
      ).join(', ');

      const context = {
        config: {
          kkh: 'TEST001',
          merged_user_list: userList,
          batch_size: 100,
          dryRun: false
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.batchCount).toBe(2); // 150个用户应该分成2个批次
      expect(result.data.totalSuccessCount).toBe(150);
      expect(
        mockWpsCalendarAdapter.batchCreateCalendarPermissions
      ).toHaveBeenCalledTimes(2);
    });

    it('应该在DryRun模式下模拟添加', async () => {
      // Mock 日历映射查询
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

      const context = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, 2021002, T001',
          dryRun: true
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.dryRun).toBe(true);
      expect(result.data.totalSuccessCount).toBe(3);
      expect(
        mockWpsCalendarAdapter.batchCreateCalendarPermissions
      ).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'DryRun模式：模拟添加权限批次',
        expect.any(Object)
      );
    });

    it('应该处理日历映射不存在的情况', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: null
      });

      const context = {
        config: {
          kkh: 'NONEXISTENT',
          merged_user_list: '2021001',
          dryRun: false
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('未找到开课号 NONEXISTENT 对应的日历映射');
    });

    it('应该处理空用户列表', async () => {
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

      const context = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '',
          dryRun: false
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.totalSuccessCount).toBe(0);
      expect(result.data.totalFailureCount).toBe(0);
      expect(result.data.batchCount).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '没有需要添加权限的用户',
        expect.any(Object)
      );
    });

    it('应该处理权限添加失败', async () => {
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

      mockWpsCalendarAdapter.batchCreateCalendarPermissions.mockRejectedValue(
        new Error('API Error')
      );

      const context = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, 2021002',
          dryRun: false
        }
      } as ExecutionContext;

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.totalSuccessCount).toBe(0);
      expect(result.data.totalFailureCount).toBe(2);
      expect(result.data.batchResults[0].success).toBe(false);
      expect(result.data.batchResults[0].error).toContain('API Error');
    });
  });

  describe('determineUserRole', () => {
    it('应该为数字开头的用户ID返回reader角色', () => {
      const role = (executor as any).determineUserRole('2021001');
      expect(role).toBe('reader');
    });

    it('应该为字母开头的用户ID返回writer角色', () => {
      const role = (executor as any).determineUserRole('T001');
      expect(role).toBe('writer');
    });

    it('应该处理混合字符的用户ID', () => {
      const role1 = (executor as any).determineUserRole('1T001');
      expect(role1).toBe('reader'); // 数字开头

      const role2 = (executor as any).determineUserRole('A2021');
      expect(role2).toBe('writer'); // 字母开头
    });
  });

  describe('createUserBatches', () => {
    it('应该正确创建用户批次', () => {
      const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
      const batches = (executor as any).createUserBatches(userIds, 2);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual(['user1', 'user2']);
      expect(batches[1]).toEqual(['user3', 'user4']);
      expect(batches[2]).toEqual(['user5']);
    });

    it('应该处理空用户列表', () => {
      const batches = (executor as any).createUserBatches([], 100);
      expect(batches).toHaveLength(0);
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      const config = {
        kkh: 'TEST001',
        merged_user_list: '2021001, T001',
        batch_size: 50,
        dryRun: false,
        xnxq: '2023-2024-1'
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('应该拒绝缺少必需参数的配置', () => {
      const config = {
        kkh: 'TEST001'
        // 缺少 merged_user_list
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'merged_user_list 参数是必需的且必须是字符串'
      );
    });

    it('应该拒绝无效的batch_size', () => {
      const config = {
        kkh: 'TEST001',
        merged_user_list: '2021001',
        batch_size: 150 // 超过100的限制
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('batch_size 参数必须是1-100之间的正整数');
    });

    it('应该拒绝无效的xnxq参数', () => {
      const config = {
        kkh: 'TEST001',
        merged_user_list: '2021001',
        xnxq: 123 // 应该是字符串
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('xnxq 参数必须是字符串');
    });
  });

  describe('addSingleBatchPermissions - 用户过滤功能', () => {
    let mockWasV7ApiUser: any;
    let mockWasV7ApiCalendar: any;

    beforeEach(() => {
      mockWasV7ApiUser = {
        getUsersByExUserIds: vi.fn()
      };

      mockWasV7ApiCalendar = {
        batchCreateCalendarPermissionsLimit: vi.fn()
      };

      // 更新mock的WPS API
      mockWpsUserAdapter.getUsersByExUserIds =
        mockWasV7ApiUser.getUsersByExUserIds;
      mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit =
        mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit;
    });

    it('应该过滤掉不存在的用户ID并记录警告', async () => {
      const calendarId = 'cal-123';
      const userIds = ['2021001', '2021002', 'T001', 'INVALID001'];
      const batchNumber = 1;

      // Mock WPS API返回部分用户存在
      mockWasV7ApiUser.getUsersByExUserIds.mockResolvedValue({
        items: [
          { ex_user_id: '2021001', user_name: 'Student1' },
          { ex_user_id: 'T001', user_name: 'Teacher1' }
          // 注意：2021002 和 INVALID001 不在返回结果中
        ]
      });

      // Mock 权限添加成功
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockResolvedValue(
        {
          code: 0,
          msg: 'success'
        }
      );

      const result = await (executor as any).addSingleBatchPermissions(
        calendarId,
        userIds,
        batchNumber
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.userCount).toBe(4); // 原始用户数量
      expect(result.successCount).toBe(2); // 成功添加的用户数量
      expect(result.failureCount).toBe(2); // 跳过的用户数量

      // 验证警告日志被调用，包含用户ID列表
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '发现不存在的用户ID，将跳过这些用户的权限添加: 2021002, INVALID001',
        expect.objectContaining({
          calendarId,
          batchNumber,
          nonExistentUserIds: ['2021002', 'INVALID001'],
          nonExistentCount: 2,
          totalUserIds: 4
        })
      );

      // 验证只为存在的用户调用权限添加API
      expect(
        mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit
      ).toHaveBeenCalledWith({
        calendar_id: calendarId,
        permissions: [
          { user_id: '2021001', role: 'reader' },
          { user_id: 'T001', role: 'reader' }
        ]
      });
    });

    it('应该处理所有用户都不存在的情况', async () => {
      const calendarId = 'cal-123';
      const userIds = ['INVALID001', 'INVALID002'];
      const batchNumber = 1;

      // Mock WPS API返回空结果
      mockWasV7ApiUser.getUsersByExUserIds.mockResolvedValue({
        items: []
      });

      const result = await (executor as any).addSingleBatchPermissions(
        calendarId,
        userIds,
        batchNumber
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.userCount).toBe(2);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
      expect(result.error).toBe('批次中没有有效的用户ID');

      // 验证警告日志被调用
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '批次中没有有效的用户ID，跳过权限添加',
        expect.objectContaining({
          calendarId,
          batchNumber,
          originalUserCount: 2,
          validUserCount: 0
        })
      );

      // 验证不会调用权限添加API
      expect(
        mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit
      ).not.toHaveBeenCalled();
    });

    it('应该处理所有用户都存在的情况', async () => {
      const calendarId = 'cal-123';
      const userIds = ['2021001', 'T001'];
      const batchNumber = 1;

      // Mock WPS API返回所有用户都存在
      mockWasV7ApiUser.getUsersByExUserIds.mockResolvedValue({
        items: [
          { ex_user_id: '2021001', user_name: 'Student1' },
          { ex_user_id: 'T001', user_name: 'Teacher1' }
        ]
      });

      // Mock 权限添加成功
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockResolvedValue(
        {
          code: 0,
          msg: 'success'
        }
      );

      const result = await (executor as any).addSingleBatchPermissions(
        calendarId,
        userIds,
        batchNumber
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.userCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);

      // 验证不会记录用户不存在的警告（因为没有不存在的用户）
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('发现不存在的用户ID'),
        expect.any(Object)
      );

      // 验证为所有用户调用权限添加API
      expect(
        mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit
      ).toHaveBeenCalledWith({
        calendar_id: calendarId,
        permissions: [
          { user_id: '2021001', role: 'reader' },
          { user_id: 'T001', role: 'reader' }
        ]
      });
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: false,
        error: { message: 'Course number cannot be empty' }
      });

      const result = await executor.healthCheck();

      expect(result).toBe('healthy');
    });

    it('应该检测到仓储问题', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: false,
        error: { message: 'Database connection failed' }
      });

      const result = await executor.healthCheck();

      expect(result).toBe('unhealthy');
      expect(mockLogger.warn).toHaveBeenCalledWith('日历映射仓储检查失败');
    });
  });
});
