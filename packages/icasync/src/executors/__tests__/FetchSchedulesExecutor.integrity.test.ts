// FetchSchedulesExecutor 数据完整性验证测试
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import FetchSchedulesExecutor from '../FetchSchedules.executor.js';
import type { FetchSchedulesConfig } from '../FetchSchedules.executor.js';
import type { ExecutionContext } from '@stratix/tasks';

// Mock 依赖
const mockJuheRenwuRepository = {
  findByKkh: vi.fn()
};

const mockAttendanceCoursesRepository = {
  createBatch: vi.fn(),
  findByJuheRenwuId: vi.fn()
};

const mockDataIntegrityService = {
  validateJuheRenwuIdsExist: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('FetchSchedulesExecutor - 数据完整性验证', () => {
  let executor: FetchSchedulesExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    executor = new FetchSchedulesExecutor(
      mockJuheRenwuRepository as any,
      mockAttendanceCoursesRepository as any,
      mockDataIntegrityService as any,
      mockLogger,
      'http://localhost:3000'
    );
  });

  describe('数据完整性验证', () => {
    it('应该在创建签到课程前验证juhe_renwu_id的有效性', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001'
      };

      const mockCourseData = [
        {
          id: 1,
          kkh: 'TEST001',
          kcmc: '高等数学',
          xnxq: '2024-2025-1',
          sfdk: '1' // 需要打卡
        },
        {
          id: 2,
          kkh: 'TEST001',
          kcmc: '线性代数',
          xnxq: '2024-2025-1',
          sfdk: '1' // 需要打卡
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      // Mock 数据完整性验证通过
      mockDataIntegrityService.validateJuheRenwuIdsExist.mockResolvedValue({
        valid: true
      });

      mockAttendanceCoursesRepository.createBatch.mockResolvedValue({
        success: true,
        data: [{ id: 1 }, { id: 2 }]
      });

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      
      // 验证数据完整性验证被调用
      expect(mockDataIntegrityService.validateJuheRenwuIdsExist).toHaveBeenCalledWith([1, 2]);
      
      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '数据完整性验证通过',
        { validatedIds: 2 }
      );
    });

    it('应该在数据完整性验证失败时抛出错误', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST002'
      };

      const mockCourseData = [
        {
          id: 999, // 不存在的ID
          kkh: 'TEST002',
          kcmc: '数据结构',
          xnxq: '2024-2025-1',
          sfdk: '1'
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      // Mock 数据完整性验证失败
      mockDataIntegrityService.validateJuheRenwuIdsExist.mockResolvedValue({
        valid: false,
        error: 'juhe_renwu_id 999 does not exist',
        details: { failedIds: [999] }
      });

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Data integrity validation failed');
      
      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        '数据完整性验证失败',
        expect.objectContaining({
          error: 'juhe_renwu_id 999 does not exist',
          details: { failedIds: [999] }
        })
      );
      
      // 验证不会尝试创建签到课程记录
      expect(mockAttendanceCoursesRepository.createBatch).not.toHaveBeenCalled();
    });

    it('应该跳过没有需要打卡课程的验证', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST003'
      };

      const mockCourseData = [
        {
          id: 1,
          kkh: 'TEST003',
          kcmc: '选修课',
          xnxq: '2024-2025-1',
          sfdk: '0' // 不需要打卡
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      
      // 验证不会调用数据完整性验证
      expect(mockDataIntegrityService.validateJuheRenwuIdsExist).not.toHaveBeenCalled();
      
      // 验证不会创建签到课程记录
      expect(mockAttendanceCoursesRepository.createBatch).not.toHaveBeenCalled();
    });

    it('应该处理空的juhe_renwu_id列表', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST004'
      };

      const mockCourseData = [
        {
          id: null, // 无效ID
          kkh: 'TEST004',
          kcmc: '测试课程',
          xnxq: '2024-2025-1',
          sfdk: '1'
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      
      // 验证不会调用数据完整性验证（因为没有有效的ID）
      expect(mockDataIntegrityService.validateJuheRenwuIdsExist).not.toHaveBeenCalled();
    });

    it('应该处理数据完整性验证服务异常', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST005'
      };

      const mockCourseData = [
        {
          id: 1,
          kkh: 'TEST005',
          kcmc: '异常测试课程',
          xnxq: '2024-2025-1',
          sfdk: '1'
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      // Mock 数据完整性验证服务抛出异常
      mockDataIntegrityService.validateJuheRenwuIdsExist.mockRejectedValue(
        new Error('Database connection failed')
      );

      const context: ExecutionContext = {
        config,
        workflowInstance: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      
      // 验证不会尝试创建签到课程记录
      expect(mockAttendanceCoursesRepository.createBatch).not.toHaveBeenCalled();
    });
  });
});
