/**
 * 变量上下文构建服务
 *
 * 负责为节点执行器构建完整的变量上下文，支持：
 * - 工作流实例级别的输入数据和上下文数据
 * - 前置节点的输出数据传递
 * - 节点间依赖关系的数据流
 * - 模板变量的层次化访问
 *
 * 版本: v3.1.0-enhanced
 */

import type { Logger } from '@stratix/core';
import type { INodeInstanceRepository } from '../interfaces/index.js';
import type { ServiceResult } from '../types/business.js';
import type { WorkflowInstancesTable } from '../types/database.js';
import type { NodeInstance } from '../types/unified-node.js';

/**
 * 变量上下文接口
 */
export interface VariableContext {
  /** 工作流实例输入数据 */
  input: Record<string, any>;
  /** 工作流实例上下文数据 */
  context: Record<string, any>;
  /** 当前节点输入数据 */
  nodeInput: Record<string, any>;
  /** 前置节点输出数据映射 */
  nodes: Record<string, any>;
  /** 直接前置节点输出（向后兼容） */
  previousNodeOutput?: any;
  /** 扁平化的所有变量（用于简单访问） */
  [key: string]: any;
}

/**
 * 变量上下文构建选项
 */
export interface VariableContextOptions {
  /** 是否包含前置节点输出 */
  includePreviousNodes?: boolean;
  /** 是否包含所有已完成节点输出 */
  includeAllCompletedNodes?: boolean;
  /** 是否扁平化变量结构 */
  flattenVariables?: boolean;
  /** 自定义变量前缀 */
  variablePrefix?: string;
}

/**
 * 变量上下文构建服务实现
 */
export default class VariableContextService {
  constructor(
    private readonly nodeInstanceRepository: INodeInstanceRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 为节点执行构建完整的变量上下文
   *
   * @param workflowInstance 工作流实例
   * @param currentNode 当前节点实例
   * @param options 构建选项
   * @returns 变量上下文对象
   */
  async buildVariableContext(
    workflowInstance: WorkflowInstancesTable,
    currentNode: NodeInstance,
    options: VariableContextOptions = {}
  ): Promise<ServiceResult<VariableContext>> {
    try {
      const {
        includePreviousNodes = true,
        includeAllCompletedNodes = false,
        flattenVariables = true,
        variablePrefix = ''
      } = options;

      this.logger.debug('Building variable context', {
        workflowInstanceId: workflowInstance.id,
        currentNodeId: currentNode.nodeId,
        options
      });

      // 1. 基础变量：工作流实例级别的数据
      const baseContext: VariableContext = {
        input: workflowInstance.input_data || {},
        context: workflowInstance.context_data || {},
        nodeInput: currentNode.inputData || {},
        nodes: {}
      };

      // 2. 获取前置节点输出数据
      if (includePreviousNodes || includeAllCompletedNodes) {
        const nodesDataResult = await this.buildNodesOutputContext(
          workflowInstance.id,
          currentNode,
          includeAllCompletedNodes
        );

        if (nodesDataResult.success && nodesDataResult.data) {
          baseContext.nodes = nodesDataResult.data.nodes;
          if (nodesDataResult.data.previousNodeOutput) {
            baseContext.previousNodeOutput =
              nodesDataResult.data.previousNodeOutput;
          }
        }
      }

      // 3. 扁平化变量结构（可选）
      if (flattenVariables) {
        const flattenedVars = this.flattenVariables(
          baseContext,
          variablePrefix
        );
        Object.assign(baseContext, flattenedVars);
      }

      this.logger.debug('Variable context built successfully', {
        workflowInstanceId: workflowInstance.id,
        currentNodeId: currentNode.nodeId,
        contextKeys: Object.keys(baseContext),
        nodesCount: Object.keys(baseContext.nodes).length
      });

      return {
        success: true,
        data: baseContext
      };
    } catch (error) {
      this.logger.error('Failed to build variable context', {
        error,
        workflowInstanceId: workflowInstance.id,
        currentNodeId: currentNode.nodeId
      });

      return {
        success: false,
        error: 'Failed to build variable context',
        errorDetails: error
      };
    }
  }

  /**
   * 构建节点输出数据上下文
   *
   * @param workflowInstanceId 工作流实例ID
   * @param currentNode 当前节点
   * @param includeAllCompleted 是否包含所有已完成节点
   * @returns 节点输出数据映射
   */
  private async buildNodesOutputContext(
    workflowInstanceId: number,
    currentNode: NodeInstance,
    includeAllCompleted: boolean = false
  ): Promise<
    ServiceResult<{ nodes: Record<string, any>; previousNodeOutput?: any }>
  > {
    try {
      const nodes: Record<string, any> = {};
      let previousNodeOutput: any = undefined;

      if (includeAllCompleted) {
        // 获取所有已完成的节点输出
        const allNodesResult =
          await this.nodeInstanceRepository.findByWorkflowInstanceId(
            workflowInstanceId
          );

        if (allNodesResult.success && allNodesResult.data) {
          // 过滤已完成的节点
          const completedNodes = allNodesResult.data.filter(
            (nodeData) =>
              nodeData.status === 'completed' && nodeData.output_data
          );

          for (const nodeData of completedNodes) {
            nodes[nodeData.node_id] = {
              output: nodeData.output_data,
              status: nodeData.status,
              completedAt: nodeData.completed_at,
              durationMs: nodeData.duration_ms
            };
          }
        }
      } else {
        // 只获取直接前置节点的输出
        const dependsOn = await this.findDependentNodes(
          workflowInstanceId,
          currentNode.nodeId
        );

        for (const dependentNodeId of dependsOn) {
          const nodeResult =
            await this.nodeInstanceRepository.findByWorkflowAndNodeId(
              workflowInstanceId,
              dependentNodeId
            );

          if (
            nodeResult.success &&
            nodeResult.data &&
            nodeResult.data.output_data
          ) {
            nodes[dependentNodeId] = {
              output: nodeResult.data.output_data,
              status: nodeResult.data.status,
              completedAt: nodeResult.data.completed_at,
              durationMs: nodeResult.data.duration_ms
            };

            // 设置最近的前置节点输出作为 previousNodeOutput（向后兼容）
            if (!previousNodeOutput) {
              previousNodeOutput = nodeResult.data.output_data;
            }
          }
        }
      }

      return {
        success: true,
        data: { nodes, previousNodeOutput }
      };
    } catch (error) {
      this.logger.error('Failed to build nodes output context', {
        error,
        workflowInstanceId,
        currentNodeId: currentNode.nodeId
      });

      return {
        success: false,
        error: 'Failed to build nodes output context',
        errorDetails: error
      };
    }
  }

  /**
   * 查找节点的依赖关系
   *
   * @param workflowInstanceId 工作流实例ID
   * @param nodeId 节点ID
   * @returns 依赖的节点ID列表
   */
  private async findDependentNodes(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<string[]> {
    // TODO: 这里需要根据工作流定义中的依赖关系来查找
    // 当前简化实现：查找所有已完成的节点作为潜在依赖
    try {
      const allNodesResult =
        await this.nodeInstanceRepository.findByWorkflowInstanceId(
          workflowInstanceId
        );

      if (allNodesResult.success && allNodesResult.data) {
        // 过滤已完成的节点，排除当前节点
        const completedNodes = allNodesResult.data.filter(
          (node: any) => node.status === 'completed' && node.node_id !== nodeId
        );

        return completedNodes.map((node: any) => node.node_id);
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to find dependent nodes', {
        error,
        workflowInstanceId,
        nodeId
      });
      return [];
    }
  }

  /**
   * 扁平化变量结构
   *
   * @param context 变量上下文
   * @param prefix 变量前缀
   * @returns 扁平化的变量对象
   */
  private flattenVariables(
    context: VariableContext,
    prefix: string = ''
  ): Record<string, any> {
    const flattened: Record<string, any> = {};

    // 扁平化输入数据
    this.flattenObject(context.input, flattened, `${prefix}input`);

    // 扁平化上下文数据
    this.flattenObject(context.context, flattened, `${prefix}context`);

    // 扁平化节点输入数据
    this.flattenObject(context.nodeInput, flattened, `${prefix}nodeInput`);

    // 扁平化节点输出数据
    for (const [nodeId, nodeData] of Object.entries(context.nodes)) {
      this.flattenObject(nodeData, flattened, `${prefix}nodes.${nodeId}`);
    }

    // 扁平化前置节点输出（向后兼容）
    if (context.previousNodeOutput) {
      this.flattenObject(
        context.previousNodeOutput,
        flattened,
        `${prefix}previousNodeOutput`
      );
    }

    return flattened;
  }

  /**
   * 递归扁平化对象
   *
   * @param obj 要扁平化的对象
   * @param target 目标对象
   * @param prefix 前缀
   */
  private flattenObject(
    obj: any,
    target: Record<string, any>,
    prefix: string
  ): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj !== 'object' || Array.isArray(obj)) {
      target[prefix] = obj;
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        this.flattenObject(value, target, newKey);
      } else {
        target[newKey] = value;
      }
    }
  }
}
