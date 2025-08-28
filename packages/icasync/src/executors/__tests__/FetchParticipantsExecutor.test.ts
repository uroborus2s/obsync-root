import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext } from '@stratix/tasks';
import FetchParticipantsExecutor from '../FetchParticipantsExecutor.js';
import type { 
  FetchParticipantsConfig, 
  FetchParticipantsResult 
} from '../FetchParticipantsExecutor.js';

// Mock 依赖
const mockStudentCourseRepository = {
  findStudentsByKkh: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('FetchParticipantsExecutor', () => {
  let executor: FetchParticipantsExecutor;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 创建执行器实例
    executor = new FetchParticipantsExecutor(
      mockStudentCourseRepository as any,
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

    it('应该拒绝缺少开课号', async () => {
      const config: FetchParticipantsConfig = {
        kkh: ''
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('开课号(kkh)必须是非空字符串');
    });

    it('应该拒绝无效的开课号长度', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'AB' // 太短
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('开课号长度应在3-20个字符之间');
    });

    it('应该拒绝无效的批次大小', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'TEST001',
        batch_size: 150
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('批次大小应在1-100之间');
    });
  });

  describe('参与者获取和分组', () => {
    it('应该处理没有参与者的情况', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'TEST001'
      };

      // Mock 查询返回空结果
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: []
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

      const data = result.data as FetchParticipantsResult;
      expect(data.total_participants).toBe(0);
      expect(data.batch_count).toBe(0);
      expect(data.items).toEqual([]);
    });

    it('应该正确分组少于100个参与者', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'TEST001',
        batch_size: 100
      };

      // Mock 查询返回50个参与者
      const participants = Array.from({ length: 50 }, (_, i) => `student${i + 1}`);
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: participants
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

      const data = result.data as FetchParticipantsResult;
      expect(data.total_participants).toBe(50);
      expect(data.batch_count).toBe(1);
      expect(data.batch_size).toBe(100);
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toHaveLength(50);
      expect(data.items[0]).toEqual(participants);
    });

    it('应该正确分组超过100个参与者', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'TEST001',
        batch_size: 100
      };

      // Mock 查询返回250个参与者
      const participants = Array.from({ length: 250 }, (_, i) => `student${i + 1}`);
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: participants
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

      const data = result.data as FetchParticipantsResult;
      expect(data.total_participants).toBe(250);
      expect(data.batch_count).toBe(3); // 250 / 100 = 3批
      expect(data.batch_size).toBe(100);
      expect(data.items).toHaveLength(3);
      
      // 验证分组
      expect(data.items[0]).toHaveLength(100); // 第一批100个
      expect(data.items[1]).toHaveLength(100); // 第二批100个
      expect(data.items[2]).toHaveLength(50);  // 第三批50个
      
      // 验证分组内容
      expect(data.items[0][0]).toBe('student1');
      expect(data.items[0][99]).toBe('student100');
      expect(data.items[1][0]).toBe('student101');
      expect(data.items[2][49]).toBe('student250');
    });

    it('应该支持自定义批次大小', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'TEST001',
        batch_size: 30
      };

      // Mock 查询返回100个参与者
      const participants = Array.from({ length: 100 }, (_, i) => `student${i + 1}`);
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: participants
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

      const data = result.data as FetchParticipantsResult;
      expect(data.total_participants).toBe(100);
      expect(data.batch_count).toBe(4); // 100 / 30 = 4批（向上取整）
      expect(data.batch_size).toBe(30);
      expect(data.items).toHaveLength(4);
      
      // 验证分组大小
      expect(data.items[0]).toHaveLength(30); // 第一批30个
      expect(data.items[1]).toHaveLength(30); // 第二批30个
      expect(data.items[2]).toHaveLength(30); // 第三批30个
      expect(data.items[3]).toHaveLength(10); // 第四批10个
    });

    it('应该处理查询参与者失败', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'TEST001'
      };

      // Mock 查询失败
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('查询课程参与者失败: 数据库连接失败');
    });

    it('应该处理查询异常', async () => {
      const config: FetchParticipantsConfig = {
        kkh: 'TEST001'
      };

      // Mock 查询抛出异常
      mockStudentCourseRepository.findStudentsByKkh.mockRejectedValue(
        new Error('网络连接超时')
      );

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
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();

      expect(health).toBe('healthy');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new FetchParticipantsExecutor(
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();

      expect(health).toBe('unhealthy');
    });
  });
});
