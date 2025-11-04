// @stratix/icasync 工作流集成测试
// 测试完整的工作流执行流程

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';

// 导入工作流定义
import { FULL_SYNC_WORKFLOW, INCREMENTAL_SYNC_WORKFLOW } from '../tasks/workflows/workflow-definitions.js';

// 导入执行器
import DataAggregationProcessor from '../executors/DataAggregation.executor.js';
import CalendarCreationProcessor from '../executors/CalendarCreationProcessor.js';
import ParticipantManagementProcessor from '../executors/ParticipantManagementProcessor.js';
import ScheduleCreationProcessor from '../executors/ScheduleCreationProcessor.js';
import StatusUpdateProcessor from '../executors/StatusUpdateProcessor.js';
import SyncCompletionProcessor from '../executors/SyncCompletionProcessor.js';
import ChangeDetectionProcessor from '../executors/ChangeDetectionProcessor.js';

/**
 * 模拟数据库API
 */
class MockDatabaseAPI implements DatabaseAPI {
  private mockData: Map<string, any[]> = new Map();

  async query(sql: string, params?: any[]): Promise<any> {
    // 模拟查询结果
    if (sql.includes('juhe_renwu')) {
      return {
        success: true,
        data: [
          { id: 1, kkh: 'TEST001', course_count: 10, teacher_ids: 'T001,T002', class_codes: 'C001,C002' },
          { id: 2, kkh: 'TEST002', course_count: 15, teacher_ids: 'T003', class_codes: 'C003' }
        ]
      };
    }

    if (sql.includes('u_jw_kcb_cur')) {
      return {
        success: true,
        data: [
          { kkh: 'TEST001', kcmc: '测试课程1', jsgh: 'T001', jsxm: '张老师', bjdm: 'C001' },
          { kkh: 'TEST002', kcmc: '测试课程2', jsgh: 'T003', jsxm: '李老师', bjdm: 'C003' }
        ]
      };
    }

    return { success: true, data: [] };
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    // 模拟执行结果
    return {
      success: true,
      data: { affectedRows: 1, insertId: Math.floor(Math.random() * 1000) }
    };
  }

  async beginTransaction(): Promise<void> {
    // 模拟事务开始
  }

  async commitTransaction(): Promise<void> {
    // 模拟事务提交
  }

  async rollbackTransaction(): Promise<void> {
    // 模拟事务回滚
  }
}

/**
 * 模拟WAS V7 API
 */
class MockWasV7ApiCalendar {
  async createCalendar(data: any): Promise<any> {
    return {
      success: true,
      data: {
        calendarId: `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        createdAt: new Date().toISOString()
      }
    };
  }

  async batchCreateCalendarPermissionsLimit(calendarId: string, participants: any[]): Promise<any> {
    return {
      success: true,
      data: {
        calendarId,
        addedCount: participants.length,
        addedAt: new Date().toISOString()
      }
    };
  }

  async batchCreateSchedules(calendarId: string, schedules: any[]): Promise<any> {
    return {
      success: true,
      data: {
        calendarId,
        createdCount: schedules.length,
        scheduleIds: schedules.map(() => `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
        createdAt: new Date().toISOString()
      }
    };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true };
  }
}

describe('工作流集成测试', () => {
  let mockDatabaseApi: MockDatabaseAPI;
  let mockWasV7Api: MockWasV7ApiCalendar;
  let logger: Logger;

  beforeEach(() => {
    mockDatabaseApi = new MockDatabaseAPI();
    mockWasV7Api = new MockWasV7ApiCalendar();
    logger = new Logger('WorkflowIntegrationTest');
  });

  afterEach(() => {
    // 清理资源
  });

  describe('工作流定义验证', () => {
    it('应该有有效的全量同步工作流定义', () => {
      expect(FULL_SYNC_WORKFLOW).toBeDefined();
      expect(FULL_SYNC_WORKFLOW.name).toBe('icasync-full-sync');
      expect(FULL_SYNC_WORKFLOW.version).toBe('1.0.0');
      expect(FULL_SYNC_WORKFLOW.nodes).toBeDefined();
      expect(FULL_SYNC_WORKFLOW.nodes.length).toBeGreaterThan(0);
    });

    it('应该有有效的增量同步工作流定义', () => {
      expect(INCREMENTAL_SYNC_WORKFLOW).toBeDefined();
      expect(INCREMENTAL_SYNC_WORKFLOW.name).toBe('icasync-incremental-sync');
      expect(INCREMENTAL_SYNC_WORKFLOW.version).toBe('1.0.0');
      expect(INCREMENTAL_SYNC_WORKFLOW.nodes).toBeDefined();
      expect(INCREMENTAL_SYNC_WORKFLOW.nodes.length).toBeGreaterThan(0);
    });

    it('工作流应该有正确的输入参数定义', () => {
      expect(FULL_SYNC_WORKFLOW.inputs).toBeDefined();
      expect(FULL_SYNC_WORKFLOW.inputs?.length).toBeGreaterThan(0);
      
      const xnxqInput = FULL_SYNC_WORKFLOW.inputs?.find(input => input.name === 'xnxq');
      expect(xnxqInput).toBeDefined();
      expect(xnxqInput?.required).toBe(true);
    });

    it('工作流应该有正确的输出参数定义', () => {
      expect(FULL_SYNC_WORKFLOW.outputs).toBeDefined();
      expect(FULL_SYNC_WORKFLOW.outputs?.length).toBeGreaterThan(0);
    });
  });

  describe('执行器功能测试', () => {
    it('数据聚合处理器应该正常工作', async () => {
      const processor = new DataAggregationProcessor(mockDatabaseApi, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          batchSize: 100,
          useNativeSQL: true,
          clearExisting: true
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.processedCount).toBeGreaterThanOrEqual(0);
    });

    it('日历创建处理器应该正常工作', async () => {
      const processor = new CalendarCreationProcessor(mockDatabaseApi, mockWasV7Api, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          batchSize: 50,
          maxConcurrency: 10
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.processedCount).toBeGreaterThanOrEqual(0);
    });

    it('参与者管理处理器应该正常工作', async () => {
      const processor = new ParticipantManagementProcessor(mockDatabaseApi, mockWasV7Api, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          batchSize: 100,
          maxConcurrency: 10
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.processedCalendars).toBeGreaterThanOrEqual(0);
    });

    it('日程创建处理器应该正常工作', async () => {
      const processor = new ScheduleCreationProcessor(mockDatabaseApi, mockWasV7Api, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          batchSize: 200,
          maxConcurrency: 8,
          createAttendanceRecords: true
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.processedCalendars).toBeGreaterThanOrEqual(0);
    });

    it('状态更新处理器应该正常工作', async () => {
      const processor = new StatusUpdateProcessor(mockDatabaseApi, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          markAsCompleted: true,
          updateTimestamp: true
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.updatedTasks).toBeGreaterThanOrEqual(0);
    });

    it('同步完成处理器应该正常工作', async () => {
      const processor = new SyncCompletionProcessor(mockDatabaseApi, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          generateReport: true,
          sendNotification: true,
          cleanupTempData: true
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.syncSummary).toBeDefined();
    });

    it('变更检测处理器应该正常工作', async () => {
      const processor = new ChangeDetectionProcessor(mockDatabaseApi, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          detectChanges: true,
          compareWithExisting: true,
          generateChangeReport: true,
          timeWindow: 24
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalChanges).toBeGreaterThanOrEqual(0);
    });
  });

  describe('执行器健康检查', () => {
    it('所有执行器应该通过健康检查', async () => {
      const processors = [
        new DataAggregationProcessor(mockDatabaseApi, logger),
        new CalendarCreationProcessor(mockDatabaseApi, mockWasV7Api, logger),
        new ParticipantManagementProcessor(mockDatabaseApi, mockWasV7Api, logger),
        new ScheduleCreationProcessor(mockDatabaseApi, mockWasV7Api, logger),
        new StatusUpdateProcessor(mockDatabaseApi, logger),
        new SyncCompletionProcessor(mockDatabaseApi, logger),
        new ChangeDetectionProcessor(mockDatabaseApi, logger)
      ];

      for (const processor of processors) {
        const healthResult = await processor.healthCheck();
        expect(healthResult.healthy).toBe(true);
        expect(healthResult.message).toBeDefined();
      }
    });
  });

  describe('配置验证测试', () => {
    it('应该正确验证无效配置', async () => {
      const processor = new DataAggregationProcessor(mockDatabaseApi, logger);
      
      const context = {
        config: {
          // 缺少必需的 xnxq 参数
          batchSize: 100
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('学年学期参数(xnxq)不能为空');
    });

    it('应该正确验证批处理大小范围', async () => {
      const processor = new DataAggregationProcessor(mockDatabaseApi, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          batchSize: 20000 // 超出范围
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('批处理大小必须在1-10000之间');
    });
  });

  describe('错误处理测试', () => {
    it('应该正确处理数据库连接错误', async () => {
      // 创建一个会失败的数据库API
      const failingDatabaseApi = {
        async query(): Promise<any> {
          return { success: false, error: { message: '数据库连接失败' } };
        },
        async execute(): Promise<any> {
          return { success: false, error: { message: '数据库连接失败' } };
        },
        async beginTransaction(): Promise<void> {
          throw new Error('事务开始失败');
        },
        async commitTransaction(): Promise<void> {},
        async rollbackTransaction(): Promise<void> {}
      };

      const processor = new DataAggregationProcessor(failingDatabaseApi as any, logger);
      
      const context = {
        config: {
          xnxq: '2024-2025-2',
          batchSize: 100
        }
      };

      const result = await processor.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('工作流执行模拟', () => {
  it('应该能够模拟完整的全量同步流程', async () => {
    const mockDatabaseApi = new MockDatabaseAPI();
    const mockWasV7Api = new MockWasV7ApiCalendar();
    const logger = new Logger('WorkflowSimulation');

    // 模拟工作流执行的各个阶段
    const stages = [
      {
        name: '数据聚合',
        processor: new DataAggregationProcessor(mockDatabaseApi, logger),
        config: { xnxq: '2024-2025-2', batchSize: 100, useNativeSQL: true, clearExisting: true }
      },
      {
        name: '日历创建',
        processor: new CalendarCreationProcessor(mockDatabaseApi, mockWasV7Api, logger),
        config: { xnxq: '2024-2025-2', batchSize: 50, maxConcurrency: 10 }
      },
      {
        name: '参与者管理',
        processor: new ParticipantManagementProcessor(mockDatabaseApi, mockWasV7Api, logger),
        config: { xnxq: '2024-2025-2', batchSize: 100, maxConcurrency: 10 }
      },
      {
        name: '日程创建',
        processor: new ScheduleCreationProcessor(mockDatabaseApi, mockWasV7Api, logger),
        config: { xnxq: '2024-2025-2', batchSize: 200, maxConcurrency: 8, createAttendanceRecords: true }
      },
      {
        name: '状态更新',
        processor: new StatusUpdateProcessor(mockDatabaseApi, logger),
        config: { xnxq: '2024-2025-2', markAsCompleted: true, updateTimestamp: true }
      },
      {
        name: '同步完成',
        processor: new SyncCompletionProcessor(mockDatabaseApi, logger),
        config: { xnxq: '2024-2025-2', generateReport: true, sendNotification: true, cleanupTempData: true }
      }
    ];

    // 按顺序执行各个阶段
    for (const stage of stages) {
      const result = await stage.processor.execute({ config: stage.config });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      logger.info(`${stage.name}阶段执行成功`, {
        duration: result.data.duration || 0
      });
    }
  });
});
