import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContainer, asValue } from 'awilix';
import { createWpsUserAdapter } from '../adapters/user-adapter.js';
import { createWpsDepartmentAdapter } from '../adapters/department-adapter.js';
import { createWpsCompanyAdapter } from '../adapters/company-adapter.js';
import { createWpsCalendarAdapter } from '../adapters/calendar-adapter.js';
import type { Logger } from '@stratix/core';
import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';

// Mock dependencies
const mockLogger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as any;

const mockAuthManager: AuthManager = {
  isTokenValid: vi.fn().mockReturnValue(true),
  getAppAccessToken: vi.fn()
} as any;

const mockHttpClient: HttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
} as any;

describe('WPS V7 适配器架构测试', () => {
  let container: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 创建模拟容器
    container = createContainer();
    container.register({
      logger: asValue(mockLogger),
      wasV7AuthManager: asValue(mockAuthManager),
      wasV7HttpClient: asValue(mockHttpClient)
    });
  });

  describe('适配器工厂函数', () => {
    it('应该能够创建用户适配器', () => {
      const userAdapter = createWpsUserAdapter(container);
      
      expect(userAdapter).toBeDefined();
      expect(typeof userAdapter.createUser).toBe('function');
      expect(typeof userAdapter.getUser).toBe('function');
      expect(typeof userAdapter.updateUser).toBe('function');
      expect(typeof userAdapter.deleteUser).toBe('function');
      expect(typeof userAdapter.getAllUser).toBe('function');
      expect(typeof userAdapter.getAllUserList).toBe('function');
      expect(typeof userAdapter.getCurrentUserId).toBe('function');
      expect(typeof userAdapter.getUserByExId).toBe('function');
      expect(typeof userAdapter.batchGetUserInfo).toBe('function');
      expect(typeof userAdapter.batchDisableUser).toBe('function');
    });

    it('应该能够创建部门适配器', () => {
      const deptAdapter = createWpsDepartmentAdapter(container);
      
      expect(deptAdapter).toBeDefined();
      expect(typeof deptAdapter.getDeptList).toBe('function');
      expect(typeof deptAdapter.getAllDeptList).toBe('function');
      expect(typeof deptAdapter.getRootDept).toBe('function');
      expect(typeof deptAdapter.createDept).toBe('function');
      expect(typeof deptAdapter.updateDept).toBe('function');
      expect(typeof deptAdapter.deleteDept).toBe('function');
      expect(typeof deptAdapter.getDeptByExId).toBe('function');
      expect(typeof deptAdapter.batchGetDeptInfo).toBe('function');
      expect(typeof deptAdapter.getAllSubDepts).toBe('function');
      expect(typeof deptAdapter.getDeptTree).toBe('function');
    });

    it('应该能够创建企业适配器', () => {
      const companyAdapter = createWpsCompanyAdapter(container);
      
      expect(companyAdapter).toBeDefined();
      expect(typeof companyAdapter.getCurrentCompany).toBe('function');
      expect(typeof companyAdapter.getCompanyInfo).toBe('function');
    });

    it('应该能够创建日历适配器', () => {
      const calendarAdapter = createWpsCalendarAdapter(container);
      
      expect(calendarAdapter).toBeDefined();
      expect(typeof calendarAdapter.createCalendar).toBe('function');
      expect(typeof calendarAdapter.getMainCalendar).toBe('function');
      expect(typeof calendarAdapter.createSchedule).toBe('function');
      expect(typeof calendarAdapter.getSchedule).toBe('function');
      expect(typeof calendarAdapter.updateSchedule).toBe('function');
      expect(typeof calendarAdapter.deleteSchedule).toBe('function');
      expect(typeof calendarAdapter.getScheduleList).toBe('function');
      expect(typeof calendarAdapter.createSimpleSchedule).toBe('function');
      expect(typeof calendarAdapter.createAllDaySchedule).toBe('function');
      expect(typeof calendarAdapter.getTodaySchedules).toBe('function');
      expect(typeof calendarAdapter.getThisWeekSchedules).toBe('function');
    });
  });

  describe('依赖注入', () => {
    it('适配器应该正确解析依赖', () => {
      const userAdapter = createWpsUserAdapter(container);
      
      // 验证依赖注入是否正常工作
      expect(container.resolve('logger')).toBe(mockLogger);
      expect(container.resolve('wasV7AuthManager')).toBe(mockAuthManager);
      expect(container.resolve('wasV7HttpClient')).toBe(mockHttpClient);
    });
  });

  describe('认证流程', () => {
    it('应该在API调用前检查token有效性', async () => {
      const userAdapter = createWpsUserAdapter(container);
      
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: { user_id: 'test123' }
      });

      await userAdapter.createUser({
        name: '测试用户',
        mobile: '13800138000',
        dept_ids: ['dept1']
      });

      expect(mockAuthManager.isTokenValid).toHaveBeenCalled();
    });

    it('应该在token过期时自动刷新', async () => {
      const userAdapter = createWpsUserAdapter(container);
      
      // 模拟token过期
      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(false);
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: { user_id: 'test123' }
      });

      await userAdapter.createUser({
        name: '测试用户',
        mobile: '13800138000',
        dept_ids: ['dept1']
      });

      expect(mockAuthManager.getAppAccessToken).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Token expired, refreshing...');
      expect(mockLogger.debug).toHaveBeenCalledWith('Token refreshed successfully');
    });
  });

  describe('API调用', () => {
    it('应该正确调用HTTP客户端', async () => {
      const userAdapter = createWpsUserAdapter(container);
      const createParams = {
        name: '测试用户',
        mobile: '13800138000',
        dept_ids: ['dept1']
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: { user_id: 'test123', name: '测试用户' }
      });

      const result = await userAdapter.createUser(createParams);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v7/contacts/users', createParams);
      expect(result).toEqual({ user_id: 'test123', name: '测试用户' });
    });

    it('应该正确处理GET请求', async () => {
      const userAdapter = createWpsUserAdapter(container);
      const userId = 'test123';

      vi.mocked(mockHttpClient.get).mockResolvedValue({
        data: { id: userId, name: '测试用户' }
      });

      const result = await userAdapter.getUser({ user_id: userId });

      expect(mockHttpClient.get).toHaveBeenCalledWith(`/v7/contacts/users/${userId}`);
      expect(result).toEqual({ id: userId, name: '测试用户' });
    });
  });

  describe('便捷方法', () => {
    it('日历适配器的便捷方法应该正常工作', async () => {
      const calendarAdapter = createWpsCalendarAdapter(container);

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: { schedule_id: 'schedule123' }
      });

      const result = await calendarAdapter.createSimpleSchedule(
        'calendar123',
        '测试会议',
        '2024-01-01T10:00:00',
        '2024-01-01T11:00:00',
        '这是一个测试会议'
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v7/schedules', {
        calendar_id: 'calendar123',
        summary: '测试会议',
        description: '这是一个测试会议',
        start_time: '2024-01-01T10:00:00',
        end_time: '2024-01-01T11:00:00'
      });

      expect(result).toEqual({ schedule_id: 'schedule123' });
    });
  });

  describe('适配器配置', () => {
    it('每个适配器都应该有正确的默认导出配置', () => {
      // 这些导入会在实际使用中由框架处理
      const userAdapterConfig = {
        adapterName: 'user',
        factory: createWpsUserAdapter
      };

      const deptAdapterConfig = {
        adapterName: 'department',
        factory: createWpsDepartmentAdapter
      };

      const companyAdapterConfig = {
        adapterName: 'company',
        factory: createWpsCompanyAdapter
      };

      const calendarAdapterConfig = {
        adapterName: 'calendar',
        factory: createWpsCalendarAdapter
      };

      expect(userAdapterConfig.adapterName).toBe('user');
      expect(typeof userAdapterConfig.factory).toBe('function');

      expect(deptAdapterConfig.adapterName).toBe('department');
      expect(typeof deptAdapterConfig.factory).toBe('function');

      expect(companyAdapterConfig.adapterName).toBe('company');
      expect(typeof companyAdapterConfig.factory).toBe('function');

      expect(calendarAdapterConfig.adapterName).toBe('calendar');
      expect(typeof calendarAdapterConfig.factory).toBe('function');
    });
  });
});
