/**
 * 节点类型转换工具
 *
 * 提供 NodeDefinition、NodeInstance 和 WorkflowNodeInstancesTable 之间的类型安全转换
 * 版本: v3.1.0-unified
 */

import type {
  NodeInstance,
  NodeTypeConverter,
  RuntimeFields,
  WorkflowNodeInstancesTable
} from '../types/unified-node.js';
import { NodeDefinition } from '../types/workflow.js';

/**
 * 字段名映射表：驼峰命名 → 下划线命名
 */
const CAMEL_TO_SNAKE_MAPPING: Record<string, string> = {
  // 实例标识
  workflowInstanceId: 'workflow_instance_id',

  // 节点标识
  nodeId: 'node_id',
  nodeName: 'node_name',
  nodeDescription: 'node_description',
  nodeType: 'node_type',

  // 执行配置
  inputData: 'input_data',
  timeoutSeconds: 'timeout_seconds',
  maxRetries: 'max_retries',
  retryDelaySeconds: 'retry_delay_seconds',
  condition: 'execution_condition',

  // 执行状态
  startedAt: 'started_at',
  completedAt: 'completed_at',
  durationMs: 'duration_ms',

  // 执行结果
  outputData: 'output_data',
  errorMessage: 'error_message',
  errorDetails: 'error_details',

  // 重试控制
  retryCount: 'retry_count',

  // 层次结构
  parentNodeId: 'parent_node_id',
  childIndex: 'child_index',

  // 循环节点
  loopProgress: 'loop_progress',
  loopTotalCount: 'loop_total_count',
  loopCompletedCount: 'loop_completed_count',

  // 并行节点
  parallelGroupId: 'parallel_group_id',
  parallelIndex: 'parallel_index',

  // 审计字段
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

/**
 * 字段名映射表：下划线命名 → 驼峰命名
 */
const SNAKE_TO_CAMEL_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE_MAPPING).map(([camel, snake]) => [snake, camel])
);

/**
 * 节点类型转换器实现
 */
export class NodeTypeConverterImpl implements NodeTypeConverter {
  /**
   * NodeDefinition → NodeInstance
   */
  definitionToInstance(
    definition: NodeDefinition,
    workflowInstanceId: number,
    additionalData: Partial<RuntimeFields> = {}
  ): Omit<NodeInstance, 'id' | 'createdAt' | 'updatedAt'> {
    // 根据节点类型安全地获取 executor 和 executorConfig
    const executor = 'executor' in definition ? definition.executor : undefined;
    const executorConfig =
      'executorConfig' in definition ? definition.executorConfig : undefined;

    return {
      // 继承基础字段
      nodeId: definition.nodeId,
      nodeName: definition.nodeName,
      nodeDescription: definition.nodeDescription,
      nodeType: definition.nodeType,
      executor,
      executorConfig,
      inputData: definition.inputData,
      timeoutSeconds: definition.timeoutSeconds,
      maxRetries: definition.maxRetries || 3, // 默认值
      retryDelaySeconds: definition.retryDelaySeconds,
      condition: definition.condition,

      // 运行时字段
      workflowInstanceId,
      status: 'pending',
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      outputData: undefined,
      errorMessage: undefined,
      errorDetails: undefined,
      retryCount: 0,
      parentNodeId: undefined,
      childIndex: undefined,
      loopProgress: undefined,
      loopTotalCount: undefined,
      loopCompletedCount: 0,
      parallelGroupId: undefined,
      parallelIndex: undefined,

      // 覆盖额外数据
      ...additionalData
    };
  }

  /**
   * NodeInstance → Database Table
   */
  instanceToTable(instance: NodeInstance): WorkflowNodeInstancesTable {
    return {
      id: instance.id,
      workflow_instance_id: instance.workflowInstanceId,
      node_id: instance.nodeId,
      node_name: instance.nodeName,
      node_description: instance.nodeDescription || null,
      node_type: instance.nodeType,
      executor: instance.executor || null,
      input_data: instance.inputData || null,
      timeout_seconds: instance.timeoutSeconds || null,
      max_retries: instance.maxRetries,
      retry_delay_seconds: instance.retryDelaySeconds || null,
      execution_condition: instance.condition || null,
      status: instance.status,
      started_at: instance.startedAt || null,
      completed_at: instance.completedAt || null,
      duration_ms: instance.durationMs || null,
      output_data: instance.outputData || null,
      error_message: instance.errorMessage || null,
      error_details: instance.errorDetails || null,
      retry_count: instance.retryCount,
      parent_node_id: instance.parentNodeId || null,
      child_index: instance.childIndex || null,
      loop_progress: instance.loopProgress || null,
      loop_total_count: instance.loopTotalCount || null,
      loop_completed_count: instance.loopCompletedCount,
      parallel_group_id: instance.parallelGroupId || null,
      parallel_index: instance.parallelIndex || null,
      created_at: instance.createdAt,
      updated_at: instance.updatedAt
    };
  }

  /**
   * Database Table → NodeInstance
   */
  tableToInstance(table: WorkflowNodeInstancesTable): NodeInstance {
    return {
      id: table.id,
      workflowInstanceId: table.workflow_instance_id,
      nodeId: table.node_id,
      nodeName: table.node_name,
      nodeDescription: table.node_description || undefined,
      nodeType: table.node_type,
      executor: table.executor || undefined,
      inputData: table.input_data || undefined,
      timeoutSeconds: table.timeout_seconds || undefined,
      maxRetries: table.max_retries,
      retryDelaySeconds: table.retry_delay_seconds || undefined,
      condition: table.execution_condition || undefined,
      status: table.status,
      startedAt: table.started_at || undefined,
      completedAt: table.completed_at || undefined,
      durationMs: table.duration_ms || undefined,
      outputData: table.output_data || undefined,
      errorMessage: table.error_message || undefined,
      errorDetails: table.error_details || undefined,
      retryCount: table.retry_count,
      parentNodeId: table.parent_node_id || undefined,
      childIndex: table.child_index || undefined,
      loopProgress: table.loop_progress || undefined,
      loopTotalCount: table.loop_total_count || undefined,
      loopCompletedCount: table.loop_completed_count,
      parallelGroupId: table.parallel_group_id || undefined,
      parallelIndex: table.parallel_index || undefined,
      createdAt: table.created_at,
      updatedAt: table.updated_at
    };
  }

  /**
   * 字段名映射：驼峰 → 下划线
   */
  camelToSnake(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = CAMEL_TO_SNAKE_MAPPING[key] || key;
      result[snakeKey] = value;
    }

    return result;
  }

  /**
   * 字段名映射：下划线 → 驼峰
   */
  snakeToCamel(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const camelKey = SNAKE_TO_CAMEL_MAPPING[key] || key;
      result[camelKey] = value;
    }

    return result;
  }
}

/**
 * 默认的节点类型转换器实例
 */
export const nodeTypeConverter = new NodeTypeConverterImpl();

/**
 * 便捷的转换函数
 */
export const convertNodeDefinitionToInstance = (
  definition: NodeDefinition,
  workflowInstanceId: number,
  additionalData?: Partial<RuntimeFields>
) =>
  nodeTypeConverter.definitionToInstance(
    definition,
    workflowInstanceId,
    additionalData
  );

export const convertNodeInstanceToTable = (instance: NodeInstance) =>
  nodeTypeConverter.instanceToTable(instance);

export const convertTableToNodeInstance = (table: WorkflowNodeInstancesTable) =>
  nodeTypeConverter.tableToInstance(table);

/**
 * 字段验证工具
 */
export function validateNodeInstanceFields(
  instance: any
): instance is NodeInstance {
  const requiredFields = [
    'id',
    'workflowInstanceId',
    'nodeId',
    'nodeName',
    'nodeType',
    'maxRetries',
    'status',
    'retryCount',
    'loopCompletedCount',
    'createdAt',
    'updatedAt'
  ];

  return requiredFields.every(
    (field) => field in instance && instance[field] !== undefined
  );
}

/**
 * 字段差异检测工具
 */
export function detectFieldDifferences(
  obj1: Record<string, any>,
  obj2: Record<string, any>
): { missing: string[]; extra: string[]; different: string[] } {
  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  const missing = [...keys1].filter((key) => !keys2.has(key));
  const extra = [...keys2].filter((key) => !keys1.has(key));
  const different = [...keys1].filter(
    (key) => keys2.has(key) && obj1[key] !== obj2[key]
  );

  return { missing, extra, different };
}
