/**
 * 工作流输入参数验证相关类型定义
 * 
 * 版本: v3.1.0-enhanced
 */

import type { WorkflowInput } from './workflow.js';

/**
 * 参数验证错误详情
 */
export interface InputValidationError {
  /** 参数名称 */
  name: string;
  /** 错误类型 */
  type: 'required' | 'type' | 'pattern' | 'range' | 'enum' | 'custom';
  /** 错误消息 */
  message: string;
  /** 期望值 */
  expected?: any;
  /** 实际值 */
  actual?: any;
  /** 额外的错误详情 */
  details?: Record<string, any>;
}

/**
 * 参数验证结果
 */
export interface InputValidationResult {
  /** 验证是否成功 */
  valid: boolean;
  /** 验证后的参数值（包含默认值处理） */
  processedInputs: Record<string, any>;
  /** 验证错误列表 */
  errors: InputValidationError[];
  /** 警告信息列表 */
  warnings?: string[];
}

/**
 * 参数处理选项
 */
export interface InputProcessingOptions {
  /** 是否严格模式（不允许未定义的参数） */
  strict?: boolean;
  /** 是否应用默认值 */
  applyDefaults?: boolean;
  /** 是否进行类型转换 */
  typeCoercion?: boolean;
  /** 自定义验证函数 */
  customValidators?: Record<string, (value: any, input: WorkflowInput) => string | null>;
}

/**
 * 参数类型转换器
 */
export interface InputTypeConverter {
  /** 字符串转换器 */
  string: (value: any) => string | null;
  /** 数字转换器 */
  number: (value: any) => number | null;
  /** 布尔值转换器 */
  boolean: (value: any) => boolean | null;
  /** 对象转换器 */
  object: (value: any) => object | null;
  /** 数组转换器 */
  array: (value: any) => any[] | null;
}

/**
 * 参数验证上下文
 */
export interface InputValidationContext {
  /** 工作流定义名称 */
  workflowName: string;
  /** 工作流版本 */
  workflowVersion: string;
  /** 输入定义列表 */
  inputDefinitions: WorkflowInput[];
  /** 原始输入数据 */
  rawInputs: Record<string, any>;
  /** 处理选项 */
  options: InputProcessingOptions;
}

/**
 * 扩展的工作流输入定义（支持更多验证规则）
 */
export interface ExtendedWorkflowInput extends WorkflowInput {
  /** 验证规则扩展 */
  validation?: {
    /** 最小值/长度 */
    min?: number;
    /** 最大值/长度 */
    max?: number;
    /** 正则表达式 */
    pattern?: string;
    /** 枚举值 */
    enum?: any[];
    /** 自定义验证函数名称 */
    customValidator?: string;
    /** 依赖的其他参数 */
    dependsOn?: string[];
    /** 条件验证规则 */
    conditionalRules?: Array<{
      condition: string;
      rules: Partial<ExtendedWorkflowInput['validation']>;
    }>;
  };
  /** 参数分组 */
  group?: string;
  /** 参数优先级 */
  priority?: number;
  /** 是否敏感参数（用于日志脱敏） */
  sensitive?: boolean;
  /** 参数示例值 */
  example?: any;
  /** 参数标签 */
  tags?: string[];
}

/**
 * 参数验证统计信息
 */
export interface InputValidationStats {
  /** 总参数数量 */
  totalInputs: number;
  /** 必需参数数量 */
  requiredInputs: number;
  /** 可选参数数量 */
  optionalInputs: number;
  /** 应用默认值的参数数量 */
  defaultsApplied: number;
  /** 类型转换的参数数量 */
  typeConversions: number;
  /** 验证错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
  /** 验证耗时（毫秒） */
  validationTime: number;
}

/**
 * 完整的参数验证报告
 */
export interface InputValidationReport extends InputValidationResult {
  /** 验证统计信息 */
  stats: InputValidationStats;
  /** 验证上下文 */
  context: InputValidationContext;
  /** 验证时间戳 */
  timestamp: Date;
  /** 验证器版本 */
  validatorVersion: string;
}
