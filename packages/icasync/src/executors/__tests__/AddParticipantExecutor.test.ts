// @stratix/icasync AddParticipantExecutor 测试
// 测试添加参与者执行器的功能

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext } from '@stratix/tasks';
import AddParticipantExecutor from '../AddParticipantExecutor.js';
import type { 
  AddParticipantConfig, 
  AddParticipantResult,
  ParticipantData 
} from '../AddParticipantExecutor.js';

// Mock 依赖
const mockCalendarSyncService = {
  addCalendarParticipants: vi.fn(),
  removeCalendarParticipants: vi.fn()
};

const mockCalendarParticipantsRepository = {
  findByCalendarAndUser: vi.fn(),
  create: vi.fn(),
  updateNullable: vi.fn(),
  delete: vi.fn()
};

const mockWasV7Calendar = {
  createCalendarPermission: vi.fn(),
  deleteCalendarPermission: vi.fn(),
  getCalendarPermissionList: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

describe('AddParticipantExecutor', () => {
  let executor: AddParticipantExecutor;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    
    executor = new AddParticipantExecutor(
      mockCalendarSyncService as any,
      mockCalendarParticipantsRepository as any,
      mockWasV7Calendar as any,
      mockLogger as any
    );
  });

  describe('配置验证', () => {
    it('应该拒绝空配置', async () => {
      const context: ExecutionContext = {
        config: null,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('配置参数不能为空');
    });

    it('应该拒绝无效的日历ID', async () => {
      const participantData: ParticipantData = {
        userCode: 'STU001',
        userName: '张三',
        userType: 'student'
      };

      const config: AddParticipantConfig = {
        calendarId: '',
        participantData
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('日历ID(calendarId)必须是非空字符串');
    });

    it('应该拒绝无效的用户类型', async () => {
      const participantData: ParticipantData = {
        userCode: 'STU001',
        userName: '张三',
        userType: 'invalid' as any
      };

      const config: AddParticipantConfig = {
        calendarId: 'cal-123',
        participantData
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('用户类型(userType)必须是student或teacher');
    });

    it('应该拒绝无效的权限角色', async () => {
      const participantData: ParticipantData = {
        userCode: 'STU001',
        userName: '张三',
        userType: 'student'
      };

      const config: AddParticipantConfig = {
        calendarId: 'cal-123',
        participantData,
        role: 'invalid' as any
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('权限角色(role)必须是reader、writer或owner之一');
    });
  });

  describe('参与者添加逻辑', () => {
    it('应该跳过已存在的参与者', async () => {
      const participantData: ParticipantData = {
        userCode: 'STU001',
        userName: '张三',
        userType: 'student'
      };

      const config: AddParticipantConfig = {
        calendarId: 'cal-123',
        participantData,
        role: 'reader'
      };

      // Mock 存在现有参与者
      mockCalendarParticipantsRepository.findByCalendarAndUser.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          calendar_id: 'cal-123',
          user_code: 'STU001',
          user_type: 'student',
          permission_role: 'reader',
          is_deleted: false,
          metadata: '{"wps_permission_id": "perm-456"}'
        }
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as AddParticipantResult;
      expect(data.operation).toBe('skipped');
      expect(data.userCode).toBe('STU001');
      expect(data.isNewParticipant).toBe(false);

      // 不应该调用WPS API
      expect(mockWasV7Calendar.createCalendarPermission).not.toHaveBeenCalled();
    });

    it('应该成功添加新参与者', async () => {
      const participantData: ParticipantData = {
        userCode: 'STU001',
        userName: '张三',
        userType: 'student',
        externalUserId: 'wps-user-123'
      };

      const config: AddParticipantConfig = {
        calendarId: 'cal-123',
        participantData,
        role: 'reader'
      };

      // Mock 不存在现有参与者
      mockCalendarParticipantsRepository.findByCalendarAndUser.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock 成功创建WPS权限
      mockWasV7Calendar.createCalendarPermission.mockResolvedValue({
        data: {
          id: 'perm-789',
          calendar_id: 'cal-123',
          user_id: 'wps-user-123',
          role: 'reader'
        },
        code: 0,
        msg: 'success'
      });

      // Mock 成功保存参与者记录
      mockCalendarParticipantsRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: 2,
          calendar_id: 'cal-123',
          user_code: 'STU001',
          user_type: 'student',
          permission_role: 'reader'
        }
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as AddParticipantResult;
      expect(data.operation).toBe('added');
      expect(data.userCode).toBe('STU001');
      expect(data.userName).toBe('张三');
      expect(data.userType).toBe('student');
      expect(data.permissionId).toBe('perm-789');
      expect(data.isNewParticipant).toBe(true);

      // 应该调用WPS API创建权限
      expect(mockWasV7Calendar.createCalendarPermission).toHaveBeenCalledWith({
        calendar_id: 'cal-123',
        user_id: 'wps-user-123',
        role: 'reader',
        id_type: 'external'
      });

      // 应该保存参与者记录
      expect(mockCalendarParticipantsRepository.create).toHaveBeenCalled();
    });

    it('应该更新已删除的参与者', async () => {
      const participantData: ParticipantData = {
        userCode: 'STU001',
        userName: '张三',
        userType: 'student'
      };

      const config: AddParticipantConfig = {
        calendarId: 'cal-123',
        participantData,
        role: 'reader'
      };

      // Mock 存在已删除的参与者
      mockCalendarParticipantsRepository.findByCalendarAndUser.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          calendar_id: 'cal-123',
          user_code: 'STU001',
          user_type: 'student',
          permission_role: 'reader',
          is_deleted: true,
          deleted_at: '2024-01-01T00:00:00Z'
        }
      });

      // Mock 成功创建WPS权限
      mockWasV7Calendar.createCalendarPermission.mockResolvedValue({
        data: {
          id: 'perm-new-789',
          calendar_id: 'cal-123',
          user_id: 'STU001',
          role: 'reader'
        },
        code: 0,
        msg: 'success'
      });

      // Mock 成功更新参与者记录
      mockCalendarParticipantsRepository.updateNullable.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          calendar_id: 'cal-123',
          user_code: 'STU001',
          user_type: 'student',
          permission_role: 'reader',
          is_deleted: false
        }
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as AddParticipantResult;
      expect(data.operation).toBe('updated');
      expect(data.isNewParticipant).toBe(false);

      // 应该更新现有记录
      expect(mockCalendarParticipantsRepository.updateNullable).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          permission_role: 'reader',
          is_deleted: false,
          deleted_at: null
        })
      );
    });

    it('应该处理WPS权限创建失败', async () => {
      const participantData: ParticipantData = {
        userCode: 'STU001',
        userName: '张三',
        userType: 'student'
      };

      const config: AddParticipantConfig = {
        calendarId: 'cal-123',
        participantData,
        role: 'reader'
      };

      // Mock 不存在现有参与者
      mockCalendarParticipantsRepository.findByCalendarAndUser.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock WPS权限创建失败
      mockWasV7Calendar.createCalendarPermission.mockRejectedValue(
        new Error('WPS API 调用失败')
      );

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.data).toBeDefined();
      
      const data = result.data as AddParticipantResult;
      expect(data.error).toContain('WPS API 调用失败');

      // 不应该保存参与者记录
      expect(mockCalendarParticipantsRepository.create).not.toHaveBeenCalled();
    });

    it('应该支持权限映射', async () => {
      const participantData: ParticipantData = {
        userCode: 'TEA001',
        userName: '李老师',
        userType: 'teacher'
      };

      const config: AddParticipantConfig = {
        calendarId: 'cal-123',
        participantData,
        permissions: 'write' // 使用旧的权限字段
      };

      // Mock 不存在现有参与者
      mockCalendarParticipantsRepository.findByCalendarAndUser.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock 成功创建WPS权限
      mockWasV7Calendar.createCalendarPermission.mockResolvedValue({
        data: {
          id: 'perm-writer-123',
          calendar_id: 'cal-123',
          user_id: 'TEA001',
          role: 'writer'
        },
        code: 0,
        msg: 'success'
      });

      // Mock 成功保存参与者记录
      mockCalendarParticipantsRepository.create.mockResolvedValue({
        success: true,
        data: { id: 3 }
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as AddParticipantResult;
      expect(data.role).toBe('writer'); // 应该映射为 writer

      // 应该使用映射后的角色调用WPS API
      expect(mockWasV7Calendar.createCalendarPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'writer'
        })
      );
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.message).toBe('执行器运行正常');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new AddParticipantExecutor(
        null as any,
        null as any,
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('依赖服务未正确注入');
    });
  });
});
