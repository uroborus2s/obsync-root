import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWpsScheduleAdapter } from '../../adapters/schedule.adapter.js';
import type { HttpClientService } from '../../services/httpClientService.js';
import type {
  BatchCreateSchedulesParams,
  BatchCreateSchedulesResponse,
  CreateScheduleParams,
  CreateScheduleResponse,
  DeleteScheduleParams,
  GetScheduleListParams,
  GetScheduleListResponse,
  GetScheduleParams,
  ScheduleInfo
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

describe('WPS V7 日程适配器测试', () => {
  let container: any;
  let scheduleAdapter: any;

  beforeEach(() => {
    vi.resetAllMocks();

    // 创建模拟容器
    container = {
      resolve: vi.fn((name: string) => {
        if (name === 'logger') return mockLogger;
        if (name === 'httpClientService') return mockHttpClient;
        throw new Error(`Unknown service: ${name}`);
      })
    };

    scheduleAdapter = createWpsScheduleAdapter(container);
  });

  describe('适配器创建', () => {
    it('应该能够创建日程适配器', () => {
      expect(scheduleAdapter).toBeDefined();
      expect(container.resolve).toHaveBeenCalledWith('httpClientService');
    });

    it('应该包含所有必需的方法', () => {
      expect(typeof scheduleAdapter.createSchedule).toBe('function');
      expect(typeof scheduleAdapter.batchCreateSchedules).toBe('function');
      expect(typeof scheduleAdapter.updateSchedule).toBe('function');
      expect(typeof scheduleAdapter.deleteSchedule).toBe('function');
      expect(typeof scheduleAdapter.getScheduleList).toBe('function');
      expect(typeof scheduleAdapter.getSchedule).toBe('function');
      expect(typeof scheduleAdapter.batchCreateAttendees).toBe('function');
    });

    it('应该包含7个日程和参与者管理方法', () => {
      const methods = Object.getOwnPropertyNames(scheduleAdapter);
      expect(methods).toHaveLength(7);
    });
  });

  describe('创建日程', () => {
    const mockScheduleResponse: CreateScheduleResponse = {
      event: {
        id: 'event-123',
        calendar_id: 'calendar-123',
        summary: '测试会议',
        description: '这是一个测试会议',
        start_time: { datetime: '2024-01-01T10:00:00Z' },
        end_time: { datetime: '2024-01-01T11:00:00Z' }
      }
    };

    beforeEach(() => {
      (mockHttpClient.post as any).mockResolvedValue({
        data: mockScheduleResponse
      });
    });

    it('应该能够创建日程', async () => {
      const params: CreateScheduleParams = {
        calendar_id: 'calendar-123',
        summary: '测试会议',
        description: '这是一个测试会议',
        start_time: { datetime: '2024-01-01T10:00:00Z' },
        end_time: { datetime: '2024-01-01T11:00:00Z' }
      };

      const result = await scheduleAdapter.createSchedule(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/calendars/calendar-123/events/create',
        {
          summary: '测试会议',
          description: '这是一个测试会议',
          start_time: { datetime: '2024-01-01T10:00:00Z' },
          end_time: { datetime: '2024-01-01T11:00:00Z' }
        }
      );
      expect(result).toEqual(mockScheduleResponse);
    });
  });

  describe('批量创建日程', () => {
    it('应该能够批量创建日程（少于100个）', async () => {
      const mockResponse: BatchCreateSchedulesResponse = {
        events: [
          {
            id: 'event-1',
            calendar_id: 'calendar-123',
            summary: '会议1',
            start_time: { datetime: '2024-01-01T10:00:00Z' },
            end_time: { datetime: '2024-01-01T11:00:00Z' }
          },
          {
            id: 'event-2',
            calendar_id: 'calendar-123',
            summary: '会议2',
            start_time: { datetime: '2024-01-01T14:00:00Z' },
            end_time: { datetime: '2024-01-01T15:00:00Z' }
          }
        ]
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const params: BatchCreateSchedulesParams = {
        calendar_id: 'calendar-123',
        events: [
          {
            summary: '会议1',
            start_time: { datetime: '2024-01-01T10:00:00Z' },
            end_time: { datetime: '2024-01-01T11:00:00Z' }
          },
          {
            summary: '会议2',
            start_time: { datetime: '2024-01-01T14:00:00Z' },
            end_time: { datetime: '2024-01-01T15:00:00Z' }
          }
        ]
      };

      const result = await scheduleAdapter.batchCreateSchedules(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/calendars/calendar-123/events/batch_create',
        { events: params.events }
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该拒绝超过100个日程的批量请求', async () => {
      const events = Array.from({ length: 150 }, (_, i) => ({
        summary: `会议-${i + 1}`,
        start_time: { datetime: '2024-01-01T10:00:00Z' },
        end_time: { datetime: '2024-01-01T11:00:00Z' }
      }));

      const params: BatchCreateSchedulesParams = {
        calendar_id: 'calendar-123',
        events
      };

      await expect(
        scheduleAdapter.batchCreateSchedules(params)
      ).rejects.toThrow(
        '批量创建日程失败：events数量不能超过100个，当前数量: 150'
      );
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('应该传播批量创建API错误', async () => {
      const events = Array.from({ length: 2 }, (_, i) => ({
        summary: `会议-${i + 1}`,
        start_time: { datetime: '2024-01-01T10:00:00Z' },
        end_time: { datetime: '2024-01-01T11:00:00Z' }
      }));

      (mockHttpClient.post as any).mockRejectedValueOnce(
        new Error('API调用失败')
      );

      const params: BatchCreateSchedulesParams = {
        calendar_id: 'calendar-123',
        events
      };

      await expect(
        scheduleAdapter.batchCreateSchedules(params)
      ).rejects.toThrow('API调用失败');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('删除日程', () => {
    it('应该能够删除日程', async () => {
      const params: DeleteScheduleParams = {
        calendar_id: 'calendar-123',
        event_id: 'event-123'
      };

      await scheduleAdapter.deleteSchedule(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/calendars/calendar-123/events/event-123/delete'
      );
    });
  });

  describe('查询日程列表', () => {
    const mockListResponse: GetScheduleListResponse = {
      items: [
        {
          id: 'event-1',
          calendar_id: 'calendar-123',
          summary: '会议1',
          start_time: { datetime: '2024-01-01T10:00:00Z' },
          end_time: { datetime: '2024-01-01T11:00:00Z' }
        }
      ],
      next_page_token: 'next-token',
      total_count: 1
    };

    beforeEach(() => {
      (mockHttpClient.get as any).mockResolvedValue({
        data: mockListResponse
      });
    });

    it('应该能够查询日程列表', async () => {
      const params: GetScheduleListParams = {
        calendar_id: 'calendar-123',
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-31T23:59:59Z'
      };

      const result = await scheduleAdapter.getScheduleList(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v7/calendars/calendar-123/events',
        {
          start_time: '2024-01-01T00:00:00Z',
          end_time: '2024-01-31T23:59:59Z'
        },
        { 'X-Kso-Id-Type': 'external' }
      );
      expect(result).toEqual(mockListResponse);
    });
  });

  describe('查询单个日程', () => {
    const mockSchedule: ScheduleInfo = {
      id: 'event-123',
      calendar_id: 'calendar-123',
      summary: '测试会议',
      description: '这是一个测试会议',
      start_time: { datetime: '2024-01-01T10:00:00Z' },
      end_time: { datetime: '2024-01-01T11:00:00Z' }
    };

    beforeEach(() => {
      (mockHttpClient.get as any).mockResolvedValue({
        data: mockSchedule
      });
    });

    it('应该能够查询单个日程', async () => {
      const params: GetScheduleParams = {
        calendar_id: 'calendar-123',
        event_id: 'event-123'
      };

      const result = await scheduleAdapter.getSchedule(params);

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v7/calendars/calendar-123/events/event-123'
      );
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('错误处理', () => {
    it('应该传播HTTP客户端错误', async () => {
      const error = new Error('Network error');
      (mockHttpClient.get as any).mockRejectedValue(error);

      const params: GetScheduleParams = {
        calendar_id: 'calendar-123',
        event_id: 'event-123'
      };

      await expect(scheduleAdapter.getSchedule(params)).rejects.toThrow(
        'Network error'
      );
    });

    it('应该传播认证错误', async () => {
      const error = new Error('Authentication failed');
      (mockHttpClient.ensureAccessToken as any).mockRejectedValue(error);

      const params: CreateScheduleParams = {
        calendar_id: 'calendar-123',
        summary: '测试会议',
        start_time: { datetime: '2024-01-01T10:00:00Z' },
        end_time: { datetime: '2024-01-01T11:00:00Z' }
      };

      await expect(scheduleAdapter.createSchedule(params)).rejects.toThrow(
        'Authentication failed'
      );
    });
  });
});
