/**
 * NodeInstanceRepository.findByWorkflowAndNodeId 方法测试
 * 专门测试修复后的错误处理逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import NodeInstanceRepository from '../NodeInstanceRepository.js';
import type { DatabaseResult } from '@stratix/database';

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

describe('NodeInstanceRepository - findByWorkflowAndNodeId 错误处理修复', () => {
  let repository: NodeInstanceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new NodeInstanceRepository(
      mockDatabaseAPI as any,
      mockLogger as any
    );
  });

  describe('正确区分查询失败和节点不存在', () => {
    it('当节点不存在时应该返回 { success: true, data: null }', async () => {
      // Mock findOneNullable 返回查询成功但无结果
      const mockFindOneNullable = vi.spyOn(repository, 'findOneNullable');
      mockFindOneNullable.mockResolvedValue({
        success: true,
        data: null
      });

      const result = await repository.findByWorkflowAndNodeId(1, 'non-existent-node');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeUndefined();
      
      // 验证调用了正确的查询方法
      expect(mockFindOneNullable).toHaveBeenCalledWith(expect.any(Function));
    });

    it('当数据库查询失败时应该返回 { success: false, error: "..." }', async () => {
      // Mock findOneNullable 返回数据库错误
      const mockFindOneNullable = vi.spyOn(repository, 'findOneNullable');
      mockFindOneNullable.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await repository.findByWorkflowAndNodeId(1, 'test-node');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error while finding node instance');
      expect(result.error).toContain('Database connection failed');
      expect(result.data).toBeUndefined();
    });

    it('当节点存在时应该返回节点数据', async () => {
      const mockNodeData = {
        id: 1,
        workflow_instance_id: 1,
        node_id: 'test-node',
        node_name: 'Test Node',
        node_type: 'simple',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock findOneNullable 返回查询成功且有结果
      const mockFindOneNullable = vi.spyOn(repository, 'findOneNullable');
      mockFindOneNullable.mockResolvedValue({
        success: true,
        data: mockNodeData
      });

      const result = await repository.findByWorkflowAndNodeId(1, 'test-node');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNodeData);
      expect(result.error).toBeUndefined();
    });
  });

  describe('查询条件验证', () => {
    it('应该使用正确的查询条件', async () => {
      const mockFindOneNullable = vi.spyOn(repository, 'findOneNullable');
      mockFindOneNullable.mockResolvedValue({
        success: true,
        data: null
      });

      await repository.findByWorkflowAndNodeId(123, 'my-node');

      // 验证查询条件
      expect(mockFindOneNullable).toHaveBeenCalledWith(expect.any(Function));
      
      // 获取传递的查询函数并验证其行为
      const queryFunction = mockFindOneNullable.mock.calls[0][0];
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis()
      };
      
      queryFunction(mockQueryBuilder);
      
      // 验证查询条件
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('workflow_instance_id', '=', 123);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('node_id', '=', 'my-node');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('parent_node_id', 'is', null);
    });
  });

  describe('向后兼容性', () => {
    it('修复后的方法应该与调用方兼容', async () => {
      // 测试 WorkflowInstanceService 的调用模式
      const mockFindOneNullable = vi.spyOn(repository, 'findOneNullable');
      mockFindOneNullable.mockResolvedValue({
        success: true,
        data: null
      });

      const result = await repository.findByWorkflowAndNodeId(1, 'node-1');

      // 调用方应该能够正确处理这种返回值
      if (result.success && result.data) {
        // 节点存在的情况
        expect(result.data).toBeDefined();
      } else if (result.success && !result.data) {
        // 节点不存在的情况（修复后的正确行为）
        expect(result.data).toBeNull();
      } else {
        // 数据库错误的情况
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('应该与 NodeExecutionService.getNodeInstance 兼容', async () => {
      // 模拟 NodeExecutionService 的使用模式
      const mockFindOneNullable = vi.spyOn(repository, 'findOneNullable');
      
      // 测试节点不存在的情况
      mockFindOneNullable.mockResolvedValue({
        success: true,
        data: null
      });

      const result = await repository.findByWorkflowAndNodeId(1, 'missing-node');

      // NodeExecutionService 应该能够检测到节点不存在
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      
      // 这样 NodeExecutionService 就可以返回适当的错误消息
      // 而不是将"节点不存在"误认为是数据库错误
    });
  });

  describe('错误消息质量', () => {
    it('数据库错误时应该提供详细的错误信息', async () => {
      const mockFindOneNullable = vi.spyOn(repository, 'findOneNullable');
      mockFindOneNullable.mockResolvedValue({
        success: false,
        error: 'Connection timeout after 5000ms'
      });

      const result = await repository.findByWorkflowAndNodeId(42, 'timeout-node');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error while finding node instance');
      expect(result.error).toContain('timeout-node');
      expect(result.error).toContain('workflow 42');
      expect(result.error).toContain('Connection timeout after 5000ms');
    });
  });
});
