/**
 * 工作流验证服务接口
 * 定义工作流验证相关的服务契约
 */

import { ServiceResult } from './service.js';

// 避免循环导入，在这里重新定义类型
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface TaskNodeValidation {
  id?: number;
  nodeId?: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  nodeType: string;
  isValid?: boolean;
  errors?: ValidationError[];
  warnings?: string[];
}

export interface WorkflowInstanceValidation {
  id?: number;
  status: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  businessKey?: string;
  mutexKey?: string;
  isValid?: boolean;
  errors?: ValidationError[];
  warnings?: string[];
  nodeValidations?: TaskNodeValidation[];
}

export interface IWorkflowValidationService {
  /**
   * 验证工作流实例数据
   */
  validateWorkflowInstance(
    data: WorkflowInstanceValidation
  ): Promise<ServiceResult<boolean>>;

  /**
   * 验证任务节点数据
   */
  validateTaskNode(data: TaskNodeValidation): Promise<ServiceResult<boolean>>;

  /**
   * 验证状态转换是否合法
   */
  validateStatusTransition(
    entityType: 'workflow' | 'task_node',
    fromStatus: string,
    toStatus: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 批量验证工作流实例
   */
  validateWorkflowInstancesBatch(
    instances: WorkflowInstanceValidation[]
  ): Promise<
    ServiceResult<{ valid: number; invalid: number; errors: ValidationError[] }>
  >;
}
