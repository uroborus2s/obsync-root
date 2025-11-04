// DataAggregationProcessor 软删除功能测试
import type { Logger } from '@stratix/core';
import type { ExecutionContext } from '@stratix/tasks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataAggregationConfig } from '../DataAggregation.executor.js';
import DataAggregationProcessor from '../DataAggregation.executor.js';

// Mock 依赖
const mockCourseAggregationService = {
  clearAggregationTable: vi.fn(),
  aggregateAndWriteData: vi.fn()
};

const mockAttendanceCoursesRepository = {
  softDeleteAll: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('DataAggregationProcessor - 软删除功能', () => {
  let processor: DataAggregationProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DataAggregationProcessor(
      mockCourseAggregationService as any,
      mockAttendanceCoursesRepository as any,
      mockLogger
    );
  });

  describe('全量同步时的签到课程清理', () => {
    it('应该在全量同步时清理所有签到课程数据', async () => {
      const config: DataAggregationConfig = {
        syncType: 'full',
        xnxq: '2024-2025-1'
      };

      // Mock 清空聚合表成功
      mockCourseAggregationService.clearAggregationTable.mockResolvedValue({
        _tag: 'Right',
        right: 100
      });

      // Mock 聚合数据成功
      mockCourseAggregationService.aggregateAndWriteData.mockResolvedValue({
        _tag: 'Right',
        right: 50
      });

      // Mock 软删除成功
      mockAttendanceCoursesRepository.softDeleteAll.mockResolvedValue({
        success: true,
        data: 15 // 删除了15条记录
      });

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await processor.execute(context);

      expect(result.success).toBe(true);

      // 验证清理所有数据被调用
      expect(
        mockAttendanceCoursesRepository.softDeleteAll
      ).toHaveBeenCalledWith('system-full-sync');

      // 验证日志记录
      expect(mockLogger.info).toHaveBeenCalledWith('开始全量清理签到课程数据', {
        currentSemester: '2024-2025-1'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '成功软删除 15 条签到课程记录',
        {
          deletedCount: 15
        }
      );
    });

    it('应该在增量同步时跳过签到课程清理', async () => {
      const config: DataAggregationConfig = {
        syncType: 'incremental',
        xnxq: '2024-2025-1'
      };

      // Mock 聚合数据成功
      mockCourseAggregationService.aggregateAndWriteData.mockResolvedValue({
        _tag: 'Right',
        right: 30
      });

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await processor.execute(context);

      expect(result.success).toBe(true);

      // 验证不会调用清理方法
      expect(
        mockAttendanceCoursesRepository.softDeleteAll
      ).not.toHaveBeenCalled();
      expect(
        mockCourseAggregationService.clearAggregationTable
      ).not.toHaveBeenCalled();
    });

    it('应该处理签到课程清理失败的情况', async () => {
      const config: DataAggregationConfig = {
        syncType: 'full',
        xnxq: '2024-2025-1'
      };

      // Mock 清空聚合表成功
      mockCourseAggregationService.clearAggregationTable.mockResolvedValue({
        _tag: 'Right',
        right: 100
      });

      // Mock 聚合数据成功
      mockCourseAggregationService.aggregateAndWriteData.mockResolvedValue({
        _tag: 'Right',
        right: 50
      });

      // Mock 软删除失败
      mockAttendanceCoursesRepository.softDeleteAll.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await processor.execute(context);

      // 主流程应该继续成功，不受清理失败影响
      expect(result.success).toBe(true);

      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        '软删除签到课程记录失败',
        expect.objectContaining({
          error: expect.objectContaining({
            success: false,
            error: '数据库连接失败'
          })
        })
      );
    });
  });

  describe('健康检查', () => {
    it('应该检查所有依赖服务', async () => {
      const health = await processor.healthCheck();
      expect(health).toBe('healthy');
    });

    it('应该检测缺失的依赖服务', async () => {
      const processorWithoutDeps = new DataAggregationProcessor(
        null as any,
        null as any,
        mockLogger
      );

      const health = await processorWithoutDeps.healthCheck();
      expect(health).toBe('unhealthy');
    });
  });
});
