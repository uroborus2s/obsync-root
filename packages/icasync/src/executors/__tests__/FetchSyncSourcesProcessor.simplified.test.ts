/**
 * FetchSyncSourcesProcessor 简化版本测试
 * 验证修改后的功能：只返回课程号数组
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import type { ExecutionContext } from '@stratix/tasks';
import FetchSyncSourcesProcessor from '../FetchSyncSourcesProcessor.js';
import type { IJuheRenwuRepository } from '../../repositories/JuheRenwuRepository.js';

describe('FetchSyncSourcesProcessor - 简化版本', () => {
  let processor: FetchSyncSourcesProcessor;
  let mockRepository: IJuheRenwuRepository;
  let mockLogger: Logger;

  beforeEach(() => {
    mockRepository = {
      findDistinctCourses: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    } as any;

    processor = new FetchSyncSourcesProcessor(mockRepository, mockLogger);
  });

  describe('execute 方法', () => {
    it('应该返回课程号字符串数组', async () => {
      // 准备测试数据
      const mockCourses = ['2024001', '2024002', '2024003', '2024004', '2024005'];
      
      (mockRepository.findDistinctCourses as any).mockResolvedValue({
        success: true,
        data: mockCourses
      });

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        },
        nodeId: 'test-node',
        workflowInstanceId: 1,
        inputData: {}
      };

      // 执行测试
      const result = await processor.execute(context);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCourses);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(5);
      expect(typeof result.data[0]).toBe('string');

      // 验证调用了正确的方法
      expect(mockRepository.findDistinctCourses).toHaveBeenCalledWith('2023-2024-1');
      expect(mockRepository.findDistinctCourses).toHaveBeenCalledTimes(1);
    });

    it('应该记录正确的日志信息', async () => {
      const mockCourses = ['2024001', '2024002', '2024003'];
      
      (mockRepository.findDistinctCourses as any).mockResolvedValue({
        success: true,
        data: mockCourses
      });

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-2'
        },
        nodeId: 'test-node',
        workflowInstanceId: 1,
        inputData: {}
      };

      await processor.execute(context);

      // 验证开始日志
      expect(mockLogger.info).toHaveBeenCalledWith('开始获取课程号列表', {
        xnxq: '2023-2024-2'
      });

      // 验证完成日志
      expect(mockLogger.info).toHaveBeenCalledWith('课程号获取完成', 
        expect.objectContaining({
          xnxq: '2023-2024-2',
          courseCount: 3,
          duration: expect.stringMatching(/\d+ms/),
          courses: mockCourses.slice(0, 5) // 前5个课程号
        })
      );
    });

    it('应该处理空课程列表', async () => {
      (mockRepository.findDistinctCourses as any).mockResolvedValue({
        success: true,
        data: []
      });

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        },
        nodeId: 'test-node',
        workflowInstanceId: 1,
        inputData: {}
      };

      const result = await processor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('应该处理大量课程号', async () => {
      // 生成100个课程号
      const mockCourses = Array.from({ length: 100 }, (_, i) => 
        `2024${String(i + 1).padStart(3, '0')}`
      );
      
      (mockRepository.findDistinctCourses as any).mockResolvedValue({
        success: true,
        data: mockCourses
      });

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        },
        nodeId: 'test-node',
        workflowInstanceId: 1,
        inputData: {}
      };

      const result = await processor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(result.data[0]).toBe('2024001');
      expect(result.data[99]).toBe('2024100');

      // 验证日志只记录前5个课程号
      expect(mockLogger.info).toHaveBeenCalledWith('课程号获取完成', 
        expect.objectContaining({
          courseCount: 100,
          courses: mockCourses.slice(0, 5)
        })
      );
    });

    it('应该处理数据库查询失败', async () => {
      (mockRepository.findDistinctCourses as any).mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        },
        nodeId: 'test-node',
        workflowInstanceId: 1,
        inputData: {}
      };

      const result = await processor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('获取课程列表失败');
      expect(result.error).toContain('Database connection failed');

      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith('获取课程号失败', 
        expect.objectContaining({
          error: expect.stringContaining('获取课程列表失败'),
          duration: expect.stringMatching(/\d+ms/),
          config: context.config
        })
      );
    });

    it('应该处理异常情况', async () => {
      (mockRepository.findDistinctCourses as any).mockRejectedValue(
        new Error('Network timeout')
      );

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        },
        nodeId: 'test-node',
        workflowInstanceId: 1,
        inputData: {}
      };

      const result = await processor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');

      expect(mockLogger.error).toHaveBeenCalledWith('获取课程号失败', 
        expect.objectContaining({
          error: 'Network timeout'
        })
      );
    });
  });

  describe('配置验证', () => {
    it('应该验证必需的 xnxq 参数', () => {
      const result = processor.validateConfig({});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('学年学期参数 xnxq 是必需的');
    });

    it('应该验证 xnxq 格式', () => {
      const result = processor.validateConfig({ xnxq: 'invalid-format' });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('学年学期格式不正确，应为：YYYY-YYYY-S');
    });

    it('应该接受正确的 xnxq 格式', () => {
      const result1 = processor.validateConfig({ xnxq: '2023-2024-1' });
      const result2 = processor.validateConfig({ xnxq: '2023-2024-2' });
      
      expect(result1.valid).toBe(true);
      expect(result1.errors).toBeUndefined();
      expect(result2.valid).toBe(true);
      expect(result2.errors).toBeUndefined();
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const result = await processor.healthCheck();
      expect(result).toBe('healthy');
    });

    it('应该检测不健康状态', async () => {
      const processorWithoutRepo = new FetchSyncSourcesProcessor(null as any, mockLogger);
      const result = await processorWithoutRepo.healthCheck();
      expect(result).toBe('unhealthy');
    });
  });

  describe('性能验证', () => {
    it('应该在合理时间内完成', async () => {
      const mockCourses = Array.from({ length: 50 }, (_, i) => `course_${i}`);
      
      (mockRepository.findDistinctCourses as any).mockResolvedValue({
        success: true,
        data: mockCourses
      });

      const context: ExecutionContext = {
        config: { xnxq: '2023-2024-1' },
        nodeId: 'test-node',
        workflowInstanceId: 1,
        inputData: {}
      };

      const startTime = Date.now();
      const result = await processor.execute(context);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});
