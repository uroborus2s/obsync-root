import type { ExecutionContext } from '@stratix/tasks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateSchedulesConfig,
  CreateSchedulesResult
} from '../AddScheduleExecutor.js';
import AddScheduleExecutor from '../AddScheduleExecutor.js';
import type { WpsScheduleData } from '../FetchSchedulesExecutor.js';

// Mock 依赖
const mockWasV7ApiSchedule = {
  batchCreateSchedules: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('CreateSchedulesExecutor', () => {
  let executor: AddScheduleExecutor;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 创建执行器实例
    executor = new AddScheduleExecutor(
      mockWasV7ApiSchedule as any,
      mockLogger as any
    );
  });

  describe('参数验证', () => {
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

    it('应该拒绝缺少日历ID', async () => {
      const config: CreateSchedulesConfig = {
        calendar_id: '',
        schedules: []
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('日历ID(calendar_id)必须是非空字符串');
    });

    it('应该拒绝非数组的日程列表', async () => {
      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules: 'not-an-array' as any
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('日程列表(schedules)必须是数组');
    });

    it('应该拒绝超过200个日程的批次', async () => {
      const schedules = Array.from({ length: 201 }, (_, i) => ({
        summary: `日程${i + 1}`,
        start_time: { datetime: '2024-01-15T08:00:00' },
        end_time: { datetime: '2024-01-15T09:00:00' }
      })) as WpsScheduleData[];

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('单批次日程数量不能超过200个');
    });

    it('应该拒绝缺少标题的日程', async () => {
      const schedules: WpsScheduleData[] = [
        {
          summary: '',
          start_time: { datetime: '2024-01-15T08:00:00' },
          end_time: { datetime: '2024-01-15T09:00:00' }
        }
      ];

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('第 1 个日程缺少标题(summary)');
    });

    it('应该拒绝缺少开始时间的日程', async () => {
      const schedules: WpsScheduleData[] = [
        {
          summary: '高等数学',
          start_time: { datetime: '' },
          end_time: { datetime: '2024-01-15T09:00:00' }
        }
      ];

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('第 1 个日程缺少开始时间');
    });
  });

  describe('日程创建逻辑', () => {
    it('应该处理空日程列表', async () => {
      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules: [],
        batch_index: 1
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as CreateSchedulesResult;
      expect(data.schedule_count).toBe(0);
      expect(data.success_count).toBe(0);
      expect(data.created_schedules).toEqual([]);

      // 不应该调用WPS API
      expect(mockWasV7ApiSchedule.batchCreateSchedules).not.toHaveBeenCalled();
    });

    it('应该成功创建日程', async () => {
      const schedules: WpsScheduleData[] = [
        {
          summary: '高等数学',
          description: '课程: 高等数学',
          start_time: { datetime: '2024-01-15T08:00:00' },
          end_time: { datetime: '2024-01-15T09:40:00' },
          location: 'A楼101',
          time_zone: 'Asia/Shanghai'
        },
        {
          summary: '线性代数',
          description: '课程: 线性代数',
          start_time: { datetime: '2024-01-15T10:00:00' },
          end_time: { datetime: '2024-01-15T11:40:00' },
          location: 'A楼102',
          time_zone: 'Asia/Shanghai'
        }
      ];

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules,
        batch_index: 1
      };

      // Mock WPS API成功响应
      const mockResponse = {
        events: [
          {
            id: 'event1',
            summary: '高等数学',
            start_time: { datetime: '2024-01-15T08:00:00' },
            end_time: { datetime: '2024-01-15T09:40:00' }
          },
          {
            id: 'event2',
            summary: '线性代数',
            start_time: { datetime: '2024-01-15T10:00:00' },
            end_time: { datetime: '2024-01-15T11:40:00' }
          }
        ]
      };
      mockWasV7ApiSchedule.batchCreateSchedules.mockResolvedValue(mockResponse);

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as CreateSchedulesResult;
      expect(data.success).toBe(true);
      expect(data.calendar_id).toBe('cal-123');
      expect(data.schedule_count).toBe(2);
      expect(data.success_count).toBe(2);
      expect(data.batch_index).toBe(1);
      expect(data.created_schedules).toHaveLength(2);
      expect(data.created_schedules![0]).toEqual({
        id: 'event1',
        summary: '高等数学',
        start_time: { datetime: '2024-01-15T08:00:00' },
        end_time: { datetime: '2024-01-15T09:40:00' }
      });

      // 验证WPS API调用
      expect(mockWasV7ApiSchedule.batchCreateSchedules).toHaveBeenCalledWith({
        calendar_id: 'cal-123',
        events: schedules
      });
    });

    it('应该处理WPS API调用失败', async () => {
      const schedules: WpsScheduleData[] = [
        {
          summary: '高等数学',
          start_time: { datetime: '2024-01-15T08:00:00' },
          end_time: { datetime: '2024-01-15T09:40:00' }
        }
      ];

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules,
        batch_index: 2
      };

      // Mock WPS API调用失败
      mockWasV7ApiSchedule.batchCreateSchedules.mockRejectedValue(
        new Error('API调用失败')
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

      const data = result.data as CreateSchedulesResult;
      expect(data.success).toBe(false);
      expect(data.schedule_count).toBe(1);
      expect(data.success_count).toBe(0);
      expect(data.batch_index).toBe(2);
      expect(data.error).toContain('API调用失败');
      expect(result.error).toContain('API调用失败');
    });

    it('应该处理大批量日程创建', async () => {
      const schedules: WpsScheduleData[] = Array.from(
        { length: 200 },
        (_, i) => ({
          summary: `课程${i + 1}`,
          start_time: { datetime: '2024-01-15T08:00:00' },
          end_time: { datetime: '2024-01-15T09:40:00' }
        })
      );

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules
      };

      // Mock WPS API成功响应
      const mockResponse = {
        events: schedules.map((schedule, i) => ({
          id: `event${i + 1}`,
          summary: schedule.summary,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))
      };
      mockWasV7ApiSchedule.batchCreateSchedules.mockResolvedValue(mockResponse);

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as CreateSchedulesResult;
      expect(data.schedule_count).toBe(200);
      expect(data.success_count).toBe(200);
      expect(data.created_schedules).toHaveLength(200);
    });

    it('应该处理执行异常', async () => {
      const schedules: WpsScheduleData[] = [
        {
          summary: '高等数学',
          start_time: { datetime: '2024-01-15T08:00:00' },
          end_time: { datetime: '2024-01-15T09:40:00' }
        }
      ];

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules
      };

      // Mock 执行过程中抛出异常
      mockWasV7ApiSchedule.batchCreateSchedules.mockImplementation(() => {
        throw new Error('网络连接超时');
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('执行失败: 网络连接超时');
    });

    it('应该处理API返回空结果', async () => {
      const schedules: WpsScheduleData[] = [
        {
          summary: '高等数学',
          start_time: { datetime: '2024-01-15T08:00:00' },
          end_time: { datetime: '2024-01-15T09:40:00' }
        }
      ];

      const config: CreateSchedulesConfig = {
        calendar_id: 'cal-123',
        schedules
      };

      // Mock WPS API返回空结果
      const mockResponse = {
        events: null
      };
      mockWasV7ApiSchedule.batchCreateSchedules.mockResolvedValue(mockResponse);

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as CreateSchedulesResult;
      expect(data.schedule_count).toBe(1);
      expect(data.success_count).toBe(0);
      expect(data.created_schedules).toEqual([]);
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();

      expect(health).toBe('healthy');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new AddScheduleExecutor(
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();

      expect(health).toBe('unhealthy');
    });
  });
});
