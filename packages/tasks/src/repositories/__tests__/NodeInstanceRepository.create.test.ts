/**
 * NodeInstanceRepository.create 方法测试
 * 专门测试修复后的完整记录返回逻辑
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import NodeInstanceRepository from '../NodeInstanceRepository.js';

// Mock dependencies
const mockDatabaseAPI = {
  getConnection: vi.fn(),
  executeQuery: vi.fn(),
  transaction: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('NodeInstanceRepository - create 方法完整记录返回修复', () => {
  let repository: NodeInstanceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new NodeInstanceRepository(
      mockDatabaseAPI as any,
      mockLogger as any
    );
  });

  describe('完整记录检查逻辑', () => {
    it('应该正确识别完整的记录', () => {
      const completeRecord = {
        id: 1,
        workflow_instance_id: 123,
        node_id: 'task-1',
        node_name: 'Task 1',
        node_type: 'simple',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        // 其他可选字段
        executor: 'test-executor',
        input_data: null,
        output_data: null
      };

      // 使用反射访问私有方法进行测试
      const isComplete = (repository as any).isCompleteRecord(completeRecord);
      expect(isComplete).toBe(true);
    });

    it('应该正确识别不完整的记录', () => {
      const incompleteRecord = {
        id: 1,
        // 缺少必需字段
        workflow_instance_id: 123
      };

      const isComplete = (repository as any).isCompleteRecord(incompleteRecord);
      expect(isComplete).toBe(false);
    });

    it('应该正确处理null或undefined', () => {
      const isCompleteNull = (repository as any).isCompleteRecord(null);
      const isCompleteUndefined = (repository as any).isCompleteRecord(
        undefined
      );
      const isCompleteEmpty = (repository as any).isCompleteRecord({});

      expect(isCompleteNull).toBe(false);
      expect(isCompleteUndefined).toBe(false);
      expect(isCompleteEmpty).toBe(false);
    });
  });

  describe('create 方法行为', () => {
    const mockNewNodeInstance = {
      workflow_instance_id: 123,
      node_id: 'test-node',
      node_name: 'Test Node',
      node_type: 'simple',
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      loop_completed_count: 0
    };

    it('当BaseRepository.create返回完整记录时，应该直接返回', async () => {
      const completeRecord = {
        id: 1,
        workflow_instance_id: 123,
        node_id: 'test-node',
        node_name: 'Test Node',
        node_type: 'simple',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        executor: null,
        input_data: null,
        output_data: null,
        error_message: null,
        retry_count: 0,
        max_retries: 3
      };

      // Mock super.create 返回完整记录
      const mockSuperCreate = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repository)),
        'create'
      );
      mockSuperCreate.mockResolvedValue({
        success: true,
        data: completeRecord
      });

      const result = await repository.create(mockNewNodeInstance as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completeRecord);
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Create result incomplete')
      );
    });

    it('当BaseRepository.create返回不完整记录时，应该重新查询', async () => {
      const incompleteRecord = {
        // 数据库插入操作的典型返回结果
        insertId: 1n, // BigInt 类型
        numInsertedOrUpdatedRows: 1n
        // 缺少业务字段
      };

      const completeRecord = {
        id: 1,
        workflow_instance_id: 123,
        node_id: 'test-node',
        node_name: 'Test Node',
        node_type: 'simple',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        executor: null,
        input_data: null,
        output_data: null,
        error_message: null,
        retry_count: 0,
        max_retries: 3
      };

      // Mock super.create 返回不完整记录
      const mockSuperCreate = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repository)),
        'create'
      );
      mockSuperCreate.mockResolvedValue({
        success: true,
        data: incompleteRecord
      });

      // Mock findById 返回完整记录
      const mockFindById = vi.spyOn(repository, 'findById');
      mockFindById.mockResolvedValue({
        success: true,
        data: completeRecord
      });

      const result = await repository.create(mockNewNodeInstance as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completeRecord);

      // 验证调用了findById（传入的是转换后的number类型）
      expect(mockFindById).toHaveBeenCalledWith(1);

      // 验证记录了调试日志
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Create result incomplete, fetching full record',
        expect.objectContaining({
          createdData: incompleteRecord,
          recordId: 1n, // BigInt 值
          hasInsertId: true,
          hasId: false,
          isComplete: false
        })
      );
    });

    it('当create返回的记录没有ID时，应该抛出错误', async () => {
      const recordWithoutId = {
        // 没有insertId或id字段
        numInsertedOrUpdatedRows: 1n,
        warningCount: 0
      };

      // Mock super.create 返回没有ID的记录
      const mockSuperCreate = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repository)),
        'create'
      );
      mockSuperCreate.mockResolvedValue({
        success: true,
        data: recordWithoutId
      });

      await expect(
        repository.create(mockNewNodeInstance as any)
      ).rejects.toThrow(
        'Create operation did not return record ID (checked both insertId and id fields)'
      );
    });

    it('当重新查询失败时，应该抛出错误', async () => {
      const incompleteRecord = {
        id: 1,
        insertId: 1
      };

      // Mock super.create 返回不完整记录
      const mockSuperCreate = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repository)),
        'create'
      );
      mockSuperCreate.mockResolvedValue({
        success: true,
        data: incompleteRecord
      });

      // Mock findById 返回失败
      const mockFindById = vi.spyOn(repository, 'findById');
      mockFindById.mockResolvedValue({
        success: false,
        error: 'Record not found'
      });

      await expect(
        repository.create(mockNewNodeInstance as any)
      ).rejects.toThrow('Failed to fetch complete record after creation: 1');
    });

    it('当BaseRepository.create失败时，应该抛出错误', async () => {
      // Mock super.create 返回失败
      const mockSuperCreate = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repository)),
        'create'
      );
      mockSuperCreate.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      await expect(
        repository.create(mockNewNodeInstance as any)
      ).rejects.toThrow('Failed to create node instance');
    });
  });

  describe('与WorkflowInstanceService的集成', () => {
    it('修复后应该与mapNodeToBusinessModel兼容', async () => {
      const completeRecord = {
        id: 1,
        workflow_instance_id: 123,
        node_id: 'test-node',
        node_name: 'Test Node',
        node_type: 'simple',
        status: 'pending',
        executor: 'test-executor',
        input_data: { timeout: 5000 }, // 配置合并到input_data
        output_data: null,
        error_message: null,
        error_details: null,
        started_at: null,
        completed_at: null,
        duration_ms: null,
        retry_count: 0,
        max_retries: 3,
        parent_node_id: null,
        child_index: null,
        loop_progress: null,
        loop_total_count: null,
        loop_completed_count: 0,
        parallel_group_id: null,
        parallel_index: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock super.create 返回完整记录
      const mockSuperCreate = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repository)),
        'create'
      );
      mockSuperCreate.mockResolvedValue({
        success: true,
        data: completeRecord
      });

      const result = await repository.create(mockNewNodeInstance as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completeRecord);

      // 验证返回的数据包含mapNodeToBusinessModel需要的所有字段
      const data = result.data!;
      expect(data.id).toBeDefined();
      expect(data.workflow_instance_id).toBeDefined();
      expect(data.node_id).toBeDefined();
      expect(data.node_name).toBeDefined();
      expect(data.node_type).toBeDefined();
      expect(data.status).toBeDefined();
      expect(data.created_at).toBeDefined();
      expect(data.updated_at).toBeDefined();
    });
  });
});
