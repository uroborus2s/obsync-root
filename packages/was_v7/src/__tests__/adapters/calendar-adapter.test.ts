import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWpsCalendarAdapter } from '../../adapters/calendar.adapter.js';
import type { HttpClientService } from '../../services/httpClientService.js';
import type {
  BatchCreateCalendarPermissionsParams,
  BatchCreateCalendarPermissionsResponse,
  CalendarInfo,
  CreateCalendarPermissionParams,
  CreateCalendarPermissionResponse,
  DeleteCalendarParams,
  DeleteCalendarPermissionParams,
  GetCalendarListParams,
  GetCalendarListResponse,
  GetCalendarParams,
  GetCalendarPermissionListParams,
  GetCalendarPermissionListResponse,
  GetCalendarResponse,
  UpdateCalendarParams,
  UpdateCalendarResponse
} from '../../types/calendar.js';

// Mock dependencies
const mockLogger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as any;

const mockHttpClient: HttpClientService = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  ensureAccessToken: vi.fn()
} as any;

describe('WPS V7 日历适配器测试', () => {
  let container: any;
  let calendarAdapter: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建模拟容器
    container = {
      resolve: vi.fn((name: string) => {
        if (name === 'logger') return mockLogger;
        if (name === 'httpClientService') return mockHttpClient;
        throw new Error(`Unknown service: ${name}`);
      })
    };

    calendarAdapter = createWpsCalendarAdapter(container);
  });

  describe('适配器创建', () => {
    it('应该能够创建日历适配器', () => {
      expect(calendarAdapter).toBeDefined();
      expect(container.resolve).toHaveBeenCalledWith('httpClientService');
    });

    it('应该包含所有必需的方法', () => {
      expect(typeof calendarAdapter.createCalendar).toBe('function');
      expect(typeof calendarAdapter.getPrimaryCalendar).toBe('function');
      expect(typeof calendarAdapter.getMainCalendar).toBe('function');
      expect(typeof calendarAdapter.getCalendar).toBe('function');
      expect(typeof calendarAdapter.getCalendarList).toBe('function');
      expect(typeof calendarAdapter.getAllCalendarList).toBe('function');
      expect(typeof calendarAdapter.updateCalendar).toBe('function');
      expect(typeof calendarAdapter.createCalendarPermission).toBe('function');
      expect(typeof calendarAdapter.getCalendarPermissionList).toBe('function');
      expect(typeof calendarAdapter.getAllCalendarPermissions).toBe('function');
      expect(typeof calendarAdapter.deleteCalendar).toBe('function');
      expect(typeof calendarAdapter.batchCreateCalendarPermissions).toBe(
        'function'
      );
      expect(typeof calendarAdapter.deleteCalendarPermission).toBe('function');
    });
  });

  describe('日历权限列表查询', () => {
    const mockCalendarId = 'test-calendar-id';
    const mockPermissionListResponse: GetCalendarPermissionListResponse = {
      items: [
        {
          permission_id: 'permission-1',
          calendar_id: mockCalendarId,
          principal_id: 'user-1',
          principal_type: 'user',
          role: 'reader'
        },
        {
          permission_id: 'permission-2',
          calendar_id: mockCalendarId,
          principal_id: 'user-2',
          principal_type: 'user',
          role: 'writer'
        }
      ],
      next_page_token: 'next-token',
      total_count: 2
    };

    beforeEach(() => {
      (mockHttpClient.get as any).mockResolvedValue({
        data: mockPermissionListResponse
      });
    });

    it('应该能够查询日历权限列表', async () => {
      const params: GetCalendarPermissionListParams = {
        calendar_id: mockCalendarId
      };

      const result = await calendarAdapter.getCalendarPermissionList(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/v7/calendars/${mockCalendarId}/permissions`,
        {},
        { 'X-Kso-Id-Type': 'internal' }
      );
      expect(result).toEqual(mockPermissionListResponse);
    });

    it('应该支持分页参数', async () => {
      const params: GetCalendarPermissionListParams = {
        calendar_id: mockCalendarId,
        page_size: 10,
        page_token: 'test-token'
      };

      await calendarAdapter.getCalendarPermissionList(params);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/v7/calendars/${mockCalendarId}/permissions`,
        {
          page_size: 10,
          page_token: 'test-token'
        },
        { 'X-Kso-Id-Type': 'internal' }
      );
    });

    it('应该支持外部ID类型', async () => {
      const params: GetCalendarPermissionListParams = {
        calendar_id: mockCalendarId,
        id_type: 'external'
      };

      await calendarAdapter.getCalendarPermissionList(params);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/v7/calendars/${mockCalendarId}/permissions`,
        {},
        { 'X-Kso-Id-Type': 'external' }
      );
    });

    it('应该处理空的查询参数', async () => {
      const params: GetCalendarPermissionListParams = {
        calendar_id: mockCalendarId,
        page_size: undefined,
        page_token: undefined
      };

      await calendarAdapter.getCalendarPermissionList(params);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/v7/calendars/${mockCalendarId}/permissions`,
        {},
        { 'X-Kso-Id-Type': 'internal' }
      );
    });
  });

  describe('错误处理', () => {
    it('应该传播HTTP客户端错误', async () => {
      const error = new Error('Network error');
      (mockHttpClient.get as any).mockRejectedValue(error);

      const params: GetCalendarPermissionListParams = {
        calendar_id: 'test-calendar-id'
      };

      await expect(
        calendarAdapter.getCalendarPermissionList(params)
      ).rejects.toThrow('Network error');
    });

    it('应该传播认证错误', async () => {
      const error = new Error('Authentication failed');
      (mockHttpClient.ensureAccessToken as any).mockRejectedValue(error);

      const params: GetCalendarPermissionListParams = {
        calendar_id: 'test-calendar-id'
      };

      await expect(
        calendarAdapter.getCalendarPermissionList(params)
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('获取所有权限列表', () => {
    it('应该能够获取所有权限（自动分页）', async () => {
      const mockFirstPageResponse: GetCalendarPermissionListResponse = {
        items: [
          {
            permission_id: 'permission-1',
            calendar_id: 'test-calendar-id',
            principal_id: 'user-1',
            principal_type: 'user',
            role: 'reader'
          }
        ],
        next_page_token: 'page-2-token'
      };

      const mockSecondPageResponse: GetCalendarPermissionListResponse = {
        items: [
          {
            permission_id: 'permission-2',
            calendar_id: 'test-calendar-id',
            principal_id: 'user-2',
            principal_type: 'user',
            role: 'writer'
          }
        ]
      };

      (mockHttpClient.get as any)
        .mockResolvedValueOnce({ data: mockFirstPageResponse })
        .mockResolvedValueOnce({ data: mockSecondPageResponse });

      const params: GetCalendarPermissionListParams = {
        calendar_id: 'test-calendar-id'
      };

      const result = await calendarAdapter.getAllCalendarPermissions(params);

      expect(result).toHaveLength(2);
      expect(result[0].permission_id).toBe('permission-1');
      expect(result[1].permission_id).toBe('permission-2');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('删除日历', () => {
    it('应该能够删除日历', async () => {
      const params: DeleteCalendarParams = {
        calendar_id: 'test-calendar-id'
      };

      await calendarAdapter.deleteCalendar(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/calendars/test-calendar-id/delete',
        {}
      );
    });
  });

  describe('批量创建日历权限', () => {
    it('应该能够批量创建权限（少于100个）', async () => {
      const mockResponse: BatchCreateCalendarPermissionsResponse = {
        items: [
          {
            permission_id: 'permission-1',
            calendar_id: 'test-calendar-id',
            principal_id: 'user-1',
            principal_type: 'user',
            role: 'reader'
          },
          {
            permission_id: 'permission-2',
            calendar_id: 'test-calendar-id',
            principal_id: 'user-2',
            principal_type: 'user',
            role: 'writer'
          }
        ]
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const params: BatchCreateCalendarPermissionsParams = {
        calendar_id: 'test-calendar-id',
        permissions: [
          { user_id: 'user-1', role: 'reader' },
          { user_id: 'user-2', role: 'writer' }
        ]
      };

      const result =
        await calendarAdapter.batchCreateCalendarPermissions(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/calendars/test-calendar-id/permissions/batch_create',
        { permissions: params.permissions },
        { 'X-Kso-Id-Type': 'internal' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该能够自动分批处理超过100个权限', async () => {
      // 创建150个权限的测试数据
      const permissions = Array.from({ length: 150 }, (_, i) => ({
        user_id: `user-${i + 1}`,
        role: 'reader' as const
      }));

      // 模拟第一批次响应（100个）
      const mockResponse1: BatchCreateCalendarPermissionsResponse = {
        items: Array.from({ length: 100 }, (_, i) => ({
          permission_id: `permission-${i + 1}`,
          calendar_id: 'test-calendar-id',
          principal_id: `user-${i + 1}`,
          principal_type: 'user' as const,
          role: 'reader' as const
        }))
      };

      // 模拟第二批次响应（50个）
      const mockResponse2: BatchCreateCalendarPermissionsResponse = {
        items: Array.from({ length: 50 }, (_, i) => ({
          permission_id: `permission-${i + 101}`,
          calendar_id: 'test-calendar-id',
          principal_id: `user-${i + 101}`,
          principal_type: 'user' as const,
          role: 'reader' as const
        }))
      };

      (mockHttpClient.post as any)
        .mockResolvedValueOnce({ data: mockResponse1 })
        .mockResolvedValueOnce({ data: mockResponse2 });

      const params: BatchCreateCalendarPermissionsParams = {
        calendar_id: 'test-calendar-id',
        permissions
      };

      const result =
        await calendarAdapter.batchCreateCalendarPermissions(params);

      // 验证调用了两次API
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);

      // 验证第一批次调用
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(
        1,
        '/v7/calendars/test-calendar-id/permissions/batch_create',
        { permissions: permissions.slice(0, 100) },
        { 'X-Kso-Id-Type': 'internal' }
      );

      // 验证第二批次调用
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(
        2,
        '/v7/calendars/test-calendar-id/permissions/batch_create',
        { permissions: permissions.slice(100, 150) },
        { 'X-Kso-Id-Type': 'internal' }
      );

      // 验证结果合并
      expect(result.items).toHaveLength(150);
      expect(result.items[0].permission_id).toBe('permission-1');
      expect(result.items[149].permission_id).toBe('permission-150');
    });

    it('应该在某个批次失败时停止处理并抛出错误', async () => {
      // 创建150个权限的测试数据
      const permissions = Array.from({ length: 150 }, (_, i) => ({
        user_id: `user-${i + 1}`,
        role: 'reader' as const
      }));

      // 第一批次成功
      const mockResponse1: BatchCreateCalendarPermissionsResponse = {
        items: Array.from({ length: 100 }, (_, i) => ({
          permission_id: `permission-${i + 1}`,
          calendar_id: 'test-calendar-id',
          principal_id: `user-${i + 1}`,
          principal_type: 'user' as const,
          role: 'reader' as const
        }))
      };

      // 第二批次失败
      (mockHttpClient.post as any)
        .mockResolvedValueOnce({ data: mockResponse1 })
        .mockRejectedValueOnce(new Error('API调用失败'));

      const params: BatchCreateCalendarPermissionsParams = {
        calendar_id: 'test-calendar-id',
        permissions
      };

      await expect(
        calendarAdapter.batchCreateCalendarPermissions(params)
      ).rejects.toThrow(
        '批量创建权限失败，已处理 100 个权限，错误: API调用失败'
      );

      // 验证只调用了两次API（第二次失败）
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('删除日历权限', () => {
    it('应该能够删除单个权限', async () => {
      const params: DeleteCalendarPermissionParams = {
        calendar_id: 'test-calendar-id',
        calendar_permission_id: 'permission-id'
      };

      await calendarAdapter.deleteCalendarPermission(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/calendars/test-calendar-id/permissions/permission-id/delete',
        {}
      );
    });
  });

  describe('与现有功能的集成', () => {
    it('应该与创建日历权限功能兼容', async () => {
      const mockCreateResponse: CreateCalendarPermissionResponse = {
        data: {
          calendar_id: 'test-calendar-id',
          id: 'permission-id',
          role: 'reader',
          user_id: 'user-id'
        },
        code: 0,
        msg: 'success'
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockCreateResponse
      });

      const createParams: CreateCalendarPermissionParams = {
        calendar_id: 'test-calendar-id',
        user_id: 'user-id',
        role: 'reader'
      };

      const createResult =
        await calendarAdapter.createCalendarPermission(createParams);
      expect(createResult).toEqual(mockCreateResponse);

      // 然后查询权限列表
      const listParams: GetCalendarPermissionListParams = {
        calendar_id: 'test-calendar-id'
      };

      await calendarAdapter.getCalendarPermissionList(listParams);

      expect(mockHttpClient.post).toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalled();
    });
  });

  describe('日历查询和更新', () => {
    const mockCalendarId = 'test-calendar-id';
    const mockCalendarInfo: CalendarInfo = {
      id: mockCalendarId,
      role: 'owner',
      summary: '测试日历',
      type: 'normal'
    };

    it('应该能够查询日历列表', async () => {
      const mockResponse: GetCalendarListResponse = {
        items: [mockCalendarInfo],
        next_page_token: 'next-token'
      };

      (mockHttpClient.get as any).mockResolvedValue({
        data: mockResponse
      });

      const params: GetCalendarListParams = {
        page_size: 10
      };

      const result = await calendarAdapter.getCalendarList(params);

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v7/calendars', {
        page_size: 10
      });
    });

    it('应该能够查询单个日历', async () => {
      const mockResponse: GetCalendarResponse = {
        data: mockCalendarInfo,
        code: 0,
        msg: 'success'
      };

      (mockHttpClient.get as any).mockResolvedValue({
        data: mockResponse
      });

      const params: GetCalendarParams = {
        calendar_id: mockCalendarId
      };

      const result = await calendarAdapter.getCalendar(params);

      expect(result).toEqual(mockCalendarInfo);
      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/v7/calendars/${mockCalendarId}`
      );
    });

    it('应该能够更新日历', async () => {
      const mockResponse: UpdateCalendarResponse = {
        code: 0,
        msg: 'success'
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const params: UpdateCalendarParams = {
        calendar_id: mockCalendarId,
        summary: '更新后的日历标题'
      };

      const result = await calendarAdapter.updateCalendar(params);

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/v7/calendars/${mockCalendarId}/update`,
        { summary: '更新后的日历标题' }
      );
    });

    it('应该能够获取所有日历列表（自动分页）', async () => {
      const mockFirstPage: GetCalendarListResponse = {
        items: [mockCalendarInfo],
        next_page_token: 'page-2'
      };

      const mockSecondPage: GetCalendarListResponse = {
        items: [
          {
            id: 'calendar-2',
            role: 'writer',
            summary: '第二个日历',
            type: 'normal'
          }
        ]
      };

      (mockHttpClient.get as any)
        .mockResolvedValueOnce({ data: mockFirstPage })
        .mockResolvedValueOnce({ data: mockSecondPage });

      const result = await calendarAdapter.getAllCalendarList();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockCalendarInfo);
      expect(result[1].id).toBe('calendar-2');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
