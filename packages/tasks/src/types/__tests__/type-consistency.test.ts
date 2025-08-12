/**
 * 类型一致性测试
 *
 * 验证WorkflowDefinition和WorkflowInstance类型定义的一致性
 */

import { describe, expect, it } from 'vitest';
import type {
  WorkflowDefinitionTable,
  WorkflowInstanceTable
} from '../database.js';
import type { WorkflowDefinition, WorkflowInstance } from '../workflow.js';

describe('类型一致性测试', () => {
  describe('WorkflowDefinition类型', () => {
    it('应该有正确的必需字段', () => {
      const definition: WorkflowDefinition = {
        name: 'test-workflow',
        version: '1.0.0',
        nodes: []
      };

      expect(definition.name).toBe('test-workflow');
      expect(definition.version).toBe('1.0.0');
      expect(definition.nodes).toEqual([]);
    });

    it('应该支持可选字段', () => {
      const definition: WorkflowDefinition = {
        id: 1,
        name: 'test-workflow',
        version: '1.0.0',
        description: 'Test workflow',
        nodes: [],
        inputs: [],
        outputs: [],
        config: {},
        tags: ['test'],
        category: 'testing',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(definition.id).toBe(1);
      expect(definition.description).toBe('Test workflow');
      expect(definition.tags).toEqual(['test']);
    });
  });

  describe('数据库表类型', () => {
    it('WorkflowDefinitionTable应该有所有必需的数据库字段', () => {
      const dbRecord: WorkflowDefinitionTable = {
        id: 1,
        name: 'test-workflow',
        version: '1.0.0',
        display_name: 'Test Workflow',
        description: 'Test workflow description',
        definition: { nodes: [], inputs: [], outputs: [] },
        category: 'testing',
        tags: ['test'],
        status: 'active',
        is_active: true,
        timeout_seconds: 3600,
        max_retries: 3,
        retry_delay_seconds: 60,
        created_by: 'system',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(dbRecord.id).toBe(1);
      expect(dbRecord.status).toBe('active');
      expect(dbRecord.is_active).toBe(true);
    });

    it('WorkflowInstanceTable应该有所有必需的数据库字段', () => {
      const dbRecord: WorkflowInstanceTable = {
        id: 1,
        workflow_definition_id: 1,
        name: 'test-instance',
        external_id: 'ext-123',
        status: 'pending',
        input_data: { key: 'value' },
        output_data: null,
        context_data: {},
        business_key: 'biz-key',
        mutex_key: 'mutex-key',
        started_at: null,
        completed_at: null,
        paused_at: null,
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: 3,
        priority: 0,
        scheduled_at: new Date(),
        current_node_id: null,
        completed_nodes: null,
        failed_nodes: null,
        lock_owner: null,
        lock_acquired_at: null,
        last_heartbeat: null,
        assigned_engine_id: null,
        assignment_strategy: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(dbRecord.id).toBe(1);
      expect(dbRecord.workflow_definition_id).toBe(1);
      expect(dbRecord.business_key).toBe('biz-key');
      expect(dbRecord.mutex_key).toBe('mutex-key');
    });
  });

  describe('WorkflowInstance类型', () => {
    it('应该有正确的必需字段', () => {
      const instance: WorkflowInstance = {
        id: 1,
        workflowDefinitionId: 1,
        name: 'test-instance',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(instance.id).toBe(1);
      expect(instance.workflowDefinitionId).toBe(1);
      expect(instance.name).toBe('test-instance');
      expect(instance.status).toBe('pending');
    });

    it('应该支持v3.0.0新增的可选字段', () => {
      const instance: WorkflowInstance = {
        id: 1,
        workflowDefinitionId: 1,
        name: 'test-instance',
        status: 'running',
        inputData: { key: 'value' },
        outputData: { result: 'success' },
        contextData: { context: 'data' },
        businessKey: 'biz-123',
        mutexKey: 'mutex-456',
        currentNodeId: 'node-1',
        lockOwner: 'engine-1',
        assignedEngineId: 'engine-1',
        assignmentStrategy: 'round-robin',
        retryCount: 1,
        maxRetries: 3,
        priority: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(instance.businessKey).toBe('biz-123');
      expect(instance.mutexKey).toBe('mutex-456');
      expect(instance.assignedEngineId).toBe('engine-1');
      expect(instance.assignmentStrategy).toBe('round-robin');
    });
  });

  describe('类型映射', () => {
    it('应该能够从数据库类型映射到业务接口类型', () => {
      const dbRecord: WorkflowDefinitionTable = {
        id: 1,
        name: 'test-workflow',
        version: '1.0.0',
        display_name: 'Test Workflow',
        description: 'Test workflow description',
        definition: {
          nodes: [{ id: 'node1', type: 'task', name: 'Test Node' }],
          inputs: [{ name: 'input1', type: 'string', required: true }],
          outputs: [{ name: 'output1', type: 'string', source: 'result' }],
          config: { timeout: 3600 }
        },
        category: 'testing',
        tags: ['test', 'example'],
        status: 'active',
        is_active: true,
        timeout_seconds: 3600,
        max_retries: 3,
        retry_delay_seconds: 60,
        created_by: 'system',
        created_at: new Date(),
        updated_at: new Date()
      };

      // 模拟映射逻辑
      const definitionData = dbRecord.definition;
      const businessDefinition: WorkflowDefinition = {
        id: dbRecord.id,
        name: dbRecord.name,
        version: dbRecord.version,
        description: dbRecord.description || undefined,
        nodes: definitionData.nodes || [],
        inputs: definitionData.inputs || [],
        outputs: definitionData.outputs || [],
        config: definitionData.config || {},
        tags: Array.isArray(dbRecord.tags) ? dbRecord.tags : [],
        category: dbRecord.category || undefined,
        createdBy: dbRecord.created_by || undefined,
        createdAt: dbRecord.created_at,
        updatedAt: dbRecord.updated_at
      };

      expect(businessDefinition.id).toBe(1);
      expect(businessDefinition.name).toBe('test-workflow');
      expect(businessDefinition.nodes).toHaveLength(1);
      expect(businessDefinition.inputs).toHaveLength(1);
      expect(businessDefinition.outputs).toHaveLength(1);
      expect(businessDefinition.tags).toEqual(['test', 'example']);
    });

    it('应该能够从WorkflowInstanceTable映射到WorkflowInstance', () => {
      const dbRecord: WorkflowInstanceTable = {
        id: 1,
        workflow_definition_id: 1,
        name: 'test-instance',
        external_id: 'ext-123',
        status: 'running',
        input_data: { input: 'data' },
        output_data: { output: 'result' },
        context_data: { context: 'info' },
        business_key: 'biz-key-123',
        mutex_key: 'mutex-key-456',
        started_at: new Date('2024-01-01T10:00:00Z'),
        completed_at: null,
        paused_at: null,
        error_message: null,
        error_details: null,
        retry_count: 1,
        max_retries: 3,
        priority: 5,
        scheduled_at: new Date('2024-01-01T09:00:00Z'),
        current_node_id: 'node-1',
        completed_nodes: ['node-0'],
        failed_nodes: null,
        lock_owner: 'engine-1',
        lock_acquired_at: new Date('2024-01-01T10:00:00Z'),
        last_heartbeat: new Date('2024-01-01T10:05:00Z'),
        assigned_engine_id: 'engine-1',
        assignment_strategy: 'round-robin',
        created_by: 'system',
        created_at: new Date('2024-01-01T09:00:00Z'),
        updated_at: new Date('2024-01-01T10:05:00Z')
      };

      // 模拟映射逻辑
      const businessInstance: WorkflowInstance = {
        id: dbRecord.id,
        workflowDefinitionId: dbRecord.workflow_definition_id,
        name: dbRecord.name,
        externalId: dbRecord.external_id || undefined,
        status: dbRecord.status as any,
        inputData: dbRecord.input_data || undefined,
        outputData: dbRecord.output_data || undefined,
        contextData: dbRecord.context_data || undefined,
        businessKey: dbRecord.business_key || undefined,
        mutexKey: dbRecord.mutex_key || undefined,
        startedAt: dbRecord.started_at || undefined,
        currentNodeId: dbRecord.current_node_id || undefined,
        completedNodes: dbRecord.completed_nodes || undefined,
        lockOwner: dbRecord.lock_owner || undefined,
        lockAcquiredAt: dbRecord.lock_acquired_at || undefined,
        lastHeartbeat: dbRecord.last_heartbeat || undefined,
        assignedEngineId: dbRecord.assigned_engine_id || undefined,
        assignmentStrategy: dbRecord.assignment_strategy || undefined,
        retryCount: dbRecord.retry_count,
        maxRetries: dbRecord.max_retries,
        priority: dbRecord.priority,
        scheduledAt: dbRecord.scheduled_at || undefined,
        createdBy: dbRecord.created_by || undefined,
        createdAt: dbRecord.created_at,
        updatedAt: dbRecord.updated_at
      };

      expect(businessInstance.id).toBe(1);
      expect(businessInstance.workflowDefinitionId).toBe(1);
      expect(businessInstance.businessKey).toBe('biz-key-123');
      expect(businessInstance.mutexKey).toBe('mutex-key-456');
      expect(businessInstance.assignedEngineId).toBe('engine-1');
      expect(businessInstance.assignmentStrategy).toBe('round-robin');
      expect(businessInstance.currentNodeId).toBe('node-1');
      expect(businessInstance.lockOwner).toBe('engine-1');
    });
  });
});
