/**
 * 工作流验证服务
 * 替代数据库约束，提供应用层数据验证
 */

import { RESOLVER } from '@stratix/core';
import {
  IWorkflowValidationService,
  TaskNodeValidation,
  ValidationError,
  WorkflowInstanceValidation
} from '../types/IWorkflowValidationService.js';
import { ServiceResult } from '../types/service.js';

export default class WorkflowValidationService
  implements IWorkflowValidationService
{
  static [RESOLVER] = {
    lifetime: 'SCOPED'
  };
  // 有效的工作流状态
  private readonly VALID_WORKFLOW_STATUSES = [
    'pending',
    'running',
    'paused',
    'completed',
    'failed',
    'cancelled',
    'timeout'
  ];

  // 有效的任务节点状态
  private readonly VALID_TASK_NODE_STATUSES = [
    'pending',
    'running',
    'completed',
    'failed',
    'skipped',
    'cancelled'
  ];

  // 有效的节点类型
  private readonly VALID_NODE_TYPES = [
    'task',
    'loop',
    'parallel',
    'condition',
    'subprocess',
    'start',
    'end'
  ];

  /**
   * 验证工作流实例数据
   */
  async validateWorkflowInstance(
    data: WorkflowInstanceValidation
  ): Promise<ServiceResult<boolean>> {
    const errors: ValidationError[] = [];

    // 验证状态
    if (!this.VALID_WORKFLOW_STATUSES.includes(data.status)) {
      errors.push({
        field: 'status',
        value: data.status,
        message: `无效的工作流状态: ${data.status}`,
        code: 'INVALID_WORKFLOW_STATUS'
      });
    }

    // 验证优先级范围
    if (data.priority < 0 || data.priority > 100) {
      errors.push({
        field: 'priority',
        value: data.priority,
        message: `优先级必须在0-100之间: ${data.priority}`,
        code: 'INVALID_PRIORITY_RANGE'
      });
    }

    // 验证重试次数
    if (data.retryCount < 0) {
      errors.push({
        field: 'retryCount',
        value: data.retryCount,
        message: `重试次数不能为负数: ${data.retryCount}`,
        code: 'INVALID_RETRY_COUNT'
      });
    }

    if (data.retryCount > data.maxRetries) {
      errors.push({
        field: 'retryCount',
        value: data.retryCount,
        message: `重试次数不能超过最大重试次数: ${data.retryCount} > ${data.maxRetries}`,
        code: 'RETRY_COUNT_EXCEEDED'
      });
    }

    // 验证业务键格式
    if (data.businessKey && !this.isValidBusinessKey(data.businessKey)) {
      errors.push({
        field: 'businessKey',
        value: data.businessKey,
        message: `无效的业务键格式: ${data.businessKey}`,
        code: 'INVALID_BUSINESS_KEY'
      });
    }

    // 验证互斥键格式
    if (data.mutexKey && !this.isValidMutexKey(data.mutexKey)) {
      errors.push({
        field: 'mutexKey',
        value: data.mutexKey,
        message: `无效的互斥键格式: ${data.mutexKey}`,
        code: 'INVALID_MUTEX_KEY'
      });
    }

    if (errors.length > 0) {
      return ServiceResult.failure(
        `工作流实例验证失败: ${errors.map((e) => e.message).join(', ')}`,
        'WORKFLOW_VALIDATION_ERROR',
        { errors }
      );
    }

    return ServiceResult.success(true);
  }

  /**
   * 验证任务节点数据
   */
  async validateTaskNode(
    data: TaskNodeValidation
  ): Promise<ServiceResult<boolean>> {
    const errors: ValidationError[] = [];

    // 验证状态
    if (!this.VALID_TASK_NODE_STATUSES.includes(data.status)) {
      errors.push({
        field: 'status',
        value: data.status,
        message: `无效的任务节点状态: ${data.status}`,
        code: 'INVALID_TASK_NODE_STATUS'
      });
    }

    // 验证节点类型
    if (!this.VALID_NODE_TYPES.includes(data.nodeType)) {
      errors.push({
        field: 'nodeType',
        value: data.nodeType,
        message: `无效的节点类型: ${data.nodeType}`,
        code: 'INVALID_NODE_TYPE'
      });
    }

    // 验证重试次数
    if (data.retryCount < 0) {
      errors.push({
        field: 'retryCount',
        value: data.retryCount,
        message: `重试次数不能为负数: ${data.retryCount}`,
        code: 'INVALID_RETRY_COUNT'
      });
    }

    if (data.retryCount > data.maxRetries) {
      errors.push({
        field: 'retryCount',
        value: data.retryCount,
        message: `重试次数不能超过最大重试次数: ${data.retryCount} > ${data.maxRetries}`,
        code: 'RETRY_COUNT_EXCEEDED'
      });
    }

    if (errors.length > 0) {
      return ServiceResult.failure(
        `任务节点验证失败: ${errors.map((e) => e.message).join(', ')}`,
        'TASK_NODE_VALIDATION_ERROR',
        { errors }
      );
    }

    return ServiceResult.success(true);
  }

  /**
   * 验证状态转换是否合法
   */
  async validateStatusTransition(
    entityType: 'workflow' | 'task_node',
    fromStatus: string,
    toStatus: string
  ): Promise<ServiceResult<boolean>> {
    const validTransitions =
      entityType === 'workflow'
        ? this.getValidWorkflowTransitions()
        : this.getValidTaskNodeTransitions();

    const allowedTransitions = validTransitions[fromStatus] || [];

    if (!allowedTransitions.includes(toStatus)) {
      return ServiceResult.failure(
        `无效的状态转换: ${fromStatus} -> ${toStatus}`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    return ServiceResult.success(true);
  }

  /**
   * 批量验证工作流实例
   */
  async validateWorkflowInstancesBatch(
    instances: WorkflowInstanceValidation[]
  ): Promise<
    ServiceResult<{ valid: number; invalid: number; errors: ValidationError[] }>
  > {
    let validCount = 0;
    let invalidCount = 0;
    const allErrors: ValidationError[] = [];

    for (const [index, instance] of instances.entries()) {
      const result = await this.validateWorkflowInstance(instance);

      if (result.success && result.data) {
        validCount++;
      } else {
        invalidCount++;
        // 如果验证失败，错误信息在 result.error 中
        if (result.error) {
          allErrors.push({
            field: `instances[${index}]`,
            value: instance,
            message: result.error,
            code: result.errorCode || 'VALIDATION_ERROR'
          });
        }
      }
    }

    return ServiceResult.success({
      valid: validCount,
      invalid: invalidCount,
      errors: allErrors
    });
  }

  /**
   * 验证业务键格式
   */
  private isValidBusinessKey(businessKey: string): boolean {
    // 业务键应该是非空字符串，长度在1-255之间
    return (
      typeof businessKey === 'string' &&
      businessKey.length > 0 &&
      businessKey.length <= 255 &&
      /^[a-zA-Z0-9_-]+$/.test(businessKey)
    );
  }

  /**
   * 验证互斥键格式
   */
  private isValidMutexKey(mutexKey: string): boolean {
    // 互斥键应该是非空字符串，长度在1-255之间
    return (
      typeof mutexKey === 'string' &&
      mutexKey.length > 0 &&
      mutexKey.length <= 255 &&
      /^[a-zA-Z0-9_:-]+$/.test(mutexKey)
    );
  }

  /**
   * 获取有效的工作流状态转换
   */
  private getValidWorkflowTransitions(): Record<string, string[]> {
    return {
      pending: ['running', 'cancelled'],
      running: ['paused', 'completed', 'failed', 'cancelled', 'timeout'],
      paused: ['running', 'cancelled'],
      completed: [], // 完成状态不能转换
      failed: ['running'], // 失败可以重试
      cancelled: [], // 取消状态不能转换
      timeout: ['running'] // 超时可以重试
    };
  }

  /**
   * 获取有效的任务节点状态转换
   */
  private getValidTaskNodeTransitions(): Record<string, string[]> {
    return {
      pending: ['running', 'skipped', 'cancelled'],
      running: ['completed', 'failed', 'cancelled'],
      completed: [], // 完成状态不能转换
      failed: ['running'], // 失败可以重试
      skipped: [], // 跳过状态不能转换
      cancelled: [] // 取消状态不能转换
    };
  }
}
