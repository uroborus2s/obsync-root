/**
 * 变量上下文服务测试
 * 
 * 测试节点执行器的变量传递机制
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import VariableContextService from '../services/VariableContextService.js';
import type { INodeInstanceRepository } from '../interfaces/index.js';
import type { NodeInstance } from '../types/business.js';
import type { WorkflowInstancesTable, WorkflowNodeInstance } from '../types/database.js';

describe('VariableContextService', () => {
  let variableContextService: VariableContextService;
  let mockNodeInstanceRepository: jest.Mocked<INodeInstanceRepository>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    mockNodeInstanceRepository = {
      findByWorkflowInstanceId: vi.fn(),
      findByWorkflowAndNodeId: vi.fn()
    } as any;

    variableContextService = new VariableContextService(
      mockNodeInstanceRepository,
      mockLogger
    );
  });

  describe('buildVariableContext', () => {
    it('should build basic variable context for first node', async () => {
      // 准备测试数据
      const workflowInstance: WorkflowInstancesTable = {
        id: 1,
        workflow_definition_id: 1,
        status: 'running',
        input_data: { userId: 123, action: 'create' },
        context_data: { environment: 'test', version: '1.0' },
        output_data: null,
        error_message: null,
        error_details: null,
        started_at: new Date(),
        completed_at: null,
        duration_ms: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const currentNode: NodeInstance = {
        id: 1,
        workflowInstanceId: 1,
        nodeId: 'start-node',
        nodeName: 'Start Node',
        nodeType: 'simple',
        executor: 'testExecutor',
        executorConfig: { param1: 'value1' },
        status: 'pending',
        inputData: { nodeParam: 'nodeValue' },
        outputData: null,
        maxRetries: 3
      };

      // Mock 没有前置节点
      mockNodeInstanceRepository.findByWorkflowInstanceId.mockResolvedValue({
        success: true,
        data: []
      });

      // 执行测试
      const result = await variableContextService.buildVariableContext(
        workflowInstance,
        currentNode
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const context = result.data!;
      expect(context.input).toEqual({ userId: 123, action: 'create' });
      expect(context.context).toEqual({ environment: 'test', version: '1.0' });
      expect(context.nodeInput).toEqual({ nodeParam: 'nodeValue' });
      expect(context.nodes).toEqual({});
      expect(context.previousNodeOutput).toBeUndefined();

      // 验证扁平化变量
      expect(context['input.userId']).toBe(123);
      expect(context['input.action']).toBe('create');
      expect(context['context.environment']).toBe('test');
      expect(context['nodeInput.nodeParam']).toBe('nodeValue');
    });

    it('should build variable context with previous node outputs', async () => {
      // 准备测试数据
      const workflowInstance: WorkflowInstancesTable = {
        id: 1,
        workflow_definition_id: 1,
        status: 'running',
        input_data: { userId: 123 },
        context_data: { environment: 'test' },
        output_data: null,
        error_message: null,
        error_details: null,
        started_at: new Date(),
        completed_at: null,
        duration_ms: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const currentNode: NodeInstance = {
        id: 2,
        workflowInstanceId: 1,
        nodeId: 'second-node',
        nodeName: 'Second Node',
        nodeType: 'simple',
        executor: 'testExecutor',
        executorConfig: {},
        status: 'pending',
        inputData: {},
        outputData: null,
        maxRetries: 3
      };

      // Mock 前置节点数据
      const previousNodeData: WorkflowNodeInstance[] = [
        {
          id: 1,
          workflow_instance_id: 1,
          node_id: 'first-node',
          node_name: 'First Node',
          node_description: null,
          node_type: 'simple',
          executor: 'testExecutor',
          executor_config: null,
          status: 'completed',
          input_data: null,
          output_data: { result: 'success', data: { createdId: 456 } },
          timeout_seconds: null,
          retry_delay_seconds: null,
          execution_condition: null,
          error_message: null,
          error_details: null,
          started_at: new Date(),
          completed_at: new Date(),
          duration_ms: 1000,
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
        }
      ];

      mockNodeInstanceRepository.findByWorkflowInstanceId.mockResolvedValue({
        success: true,
        data: previousNodeData
      });

      // 执行测试
      const result = await variableContextService.buildVariableContext(
        workflowInstance,
        currentNode
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const context = result.data!;
      expect(context.input).toEqual({ userId: 123 });
      expect(context.context).toEqual({ environment: 'test' });
      expect(context.nodes['first-node']).toBeDefined();
      expect(context.nodes['first-node'].output).toEqual({ 
        result: 'success', 
        data: { createdId: 456 } 
      });
      expect(context.previousNodeOutput).toEqual({ 
        result: 'success', 
        data: { createdId: 456 } 
      });

      // 验证扁平化的节点输出变量
      expect(context['nodes.first-node.output.result']).toBe('success');
      expect(context['nodes.first-node.output.data.createdId']).toBe(456);
      expect(context['previousNodeOutput.result']).toBe('success');
      expect(context['previousNodeOutput.data.createdId']).toBe(456);
    });

    it('should handle multiple completed nodes', async () => {
      // 准备测试数据
      const workflowInstance: WorkflowInstancesTable = {
        id: 1,
        workflow_definition_id: 1,
        status: 'running',
        input_data: { userId: 123 },
        context_data: {},
        output_data: null,
        error_message: null,
        error_details: null,
        started_at: new Date(),
        completed_at: null,
        duration_ms: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const currentNode: NodeInstance = {
        id: 3,
        workflowInstanceId: 1,
        nodeId: 'third-node',
        nodeName: 'Third Node',
        nodeType: 'simple',
        executor: 'testExecutor',
        executorConfig: {},
        status: 'pending',
        inputData: {},
        outputData: null,
        maxRetries: 3
      };

      // Mock 多个前置节点数据
      const completedNodes: WorkflowNodeInstance[] = [
        {
          id: 1,
          workflow_instance_id: 1,
          node_id: 'first-node',
          node_name: 'First Node',
          node_description: null,
          node_type: 'simple',
          executor: 'testExecutor',
          executor_config: null,
          status: 'completed',
          input_data: null,
          output_data: { step1Result: 'done' },
          timeout_seconds: null,
          retry_delay_seconds: null,
          execution_condition: null,
          error_message: null,
          error_details: null,
          started_at: new Date(),
          completed_at: new Date(),
          duration_ms: 1000,
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
        },
        {
          id: 2,
          workflow_instance_id: 1,
          node_id: 'second-node',
          node_name: 'Second Node',
          node_description: null,
          node_type: 'simple',
          executor: 'testExecutor',
          executor_config: null,
          status: 'completed',
          input_data: null,
          output_data: { step2Result: 'finished', count: 5 },
          timeout_seconds: null,
          retry_delay_seconds: null,
          execution_condition: null,
          error_message: null,
          error_details: null,
          started_at: new Date(),
          completed_at: new Date(),
          duration_ms: 2000,
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
        }
      ];

      mockNodeInstanceRepository.findByWorkflowInstanceId.mockResolvedValue({
        success: true,
        data: completedNodes
      });

      // 执行测试
      const result = await variableContextService.buildVariableContext(
        workflowInstance,
        currentNode,
        { includeAllCompletedNodes: true }
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const context = result.data!;
      expect(Object.keys(context.nodes)).toHaveLength(2);
      expect(context.nodes['first-node'].output).toEqual({ step1Result: 'done' });
      expect(context.nodes['second-node'].output).toEqual({ step2Result: 'finished', count: 5 });

      // 验证扁平化变量
      expect(context['nodes.first-node.output.step1Result']).toBe('done');
      expect(context['nodes.second-node.output.step2Result']).toBe('finished');
      expect(context['nodes.second-node.output.count']).toBe(5);
    });

    it('should handle errors gracefully', async () => {
      const workflowInstance: WorkflowInstancesTable = {
        id: 1,
        workflow_definition_id: 1,
        status: 'running',
        input_data: { userId: 123 },
        context_data: {},
        output_data: null,
        error_message: null,
        error_details: null,
        started_at: new Date(),
        completed_at: null,
        duration_ms: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const currentNode: NodeInstance = {
        id: 1,
        workflowInstanceId: 1,
        nodeId: 'test-node',
        nodeName: 'Test Node',
        nodeType: 'simple',
        executor: 'testExecutor',
        executorConfig: {},
        status: 'pending',
        inputData: {},
        outputData: null,
        maxRetries: 3
      };

      // Mock 数据库错误
      mockNodeInstanceRepository.findByWorkflowInstanceId.mockRejectedValue(
        new Error('Database connection failed')
      );

      // 执行测试
      const result = await variableContextService.buildVariableContext(
        workflowInstance,
        currentNode
      );

      // 验证错误处理
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to build variable context');
      expect(result.errorDetails).toBeInstanceOf(Error);
    });
  });
});
