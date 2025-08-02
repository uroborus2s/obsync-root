/**
 * 参数验证工具
 */

import { ConfigurationError, InvalidMessageError } from '../errors/index.js';
import {
  ConsumerOptions,
  Message,
  ProducerConfig,
  QueueConfig
} from '../types/index.js';

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 验证规则接口
export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function';
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
  message?: string;
}

// 通用验证器类
export class Validator {
  static validate<T>(data: T, rules: ValidationRule<T>[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];
      const fieldName = String(rule.field);

      // 检查必填字段
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`${fieldName} is required`);
        continue;
      }

      // 如果字段为空且非必填，跳过其他验证
      if (value === undefined || value === null) {
        continue;
      }

      // 类型验证
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push(`${fieldName} must be of type ${rule.type}`);
        continue;
      }

      // 数值范围验证
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${fieldName} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${fieldName} must be at most ${rule.max}`);
        }
      }

      // 字符串长度验证
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`${fieldName} must be at least ${rule.min} characters`);
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`${fieldName} must be at most ${rule.max} characters`);
        }
      }

      // 正则表达式验证
      if (
        rule.pattern &&
        typeof value === 'string' &&
        !rule.pattern.test(value)
      ) {
        errors.push(rule.message || `${fieldName} format is invalid`);
      }

      // 自定义验证器
      if (rule.validator && !rule.validator(value)) {
        errors.push(rule.message || `${fieldName} validation failed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        );
      case 'array':
        return Array.isArray(value);
      case 'function':
        return typeof value === 'function';
      default:
        return true;
    }
  }
}

// 队列配置验证
export const validateQueueConfig = (config: QueueConfig): void => {
  const rules: ValidationRule<QueueConfig>[] = [
    { field: 'maxLength', type: 'number', min: 1 },
    { field: 'retention', type: 'number', min: 1000 }, // 至少1秒
    { field: 'deadLetterQueue', type: 'string', min: 1 },
    { field: 'retryAttempts', type: 'number', min: 0, max: 100 },
    { field: 'retryDelay', type: 'number', min: 0 },
    { field: 'priority', type: 'boolean' },
    { field: 'compression', type: 'boolean' },
    {
      field: 'serialization',
      type: 'string',
      validator: (value) => ['json', 'msgpack', 'protobuf'].includes(value),
      message: 'serialization must be one of: json, msgpack, protobuf'
    }
  ];

  const result = Validator.validate(config, rules);
  if (!result.isValid) {
    throw new ConfigurationError(
      `Invalid queue config: ${result.errors.join(', ')}`
    );
  }
};

// 生产者配置验证
export const validateProducerConfig = (config: ProducerConfig): void => {
  const rules: ValidationRule<ProducerConfig>[] = [
    { field: 'batchSize', type: 'number', min: 1, max: 10000 },
    { field: 'batchTimeout', type: 'number', min: 1 },
    { field: 'compression', type: 'boolean' },
    {
      field: 'serialization',
      type: 'string',
      validator: (value) => ['json', 'msgpack', 'protobuf'].includes(value),
      message: 'serialization must be one of: json, msgpack, protobuf'
    },
    { field: 'maxRetries', type: 'number', min: 0, max: 100 },
    { field: 'retryDelay', type: 'number', min: 0 }
  ];

  const result = Validator.validate(config, rules);
  if (!result.isValid) {
    throw new ConfigurationError(
      `Invalid producer config: ${result.errors.join(', ')}`
    );
  }
};

// 消费者配置验证
export const validateConsumerOptions = (options: ConsumerOptions): void => {
  const rules: ValidationRule<ConsumerOptions>[] = [
    { field: 'consumerGroup', type: 'string', min: 1 },
    { field: 'consumerId', type: 'string', min: 1 },
    { field: 'batchSize', type: 'number', min: 1, max: 10000 },
    { field: 'timeout', type: 'number', min: 1 },
    { field: 'autoAck', type: 'boolean' },
    { field: 'maxRetries', type: 'number', min: 0, max: 100 },
    { field: 'retryDelay', type: 'number', min: 0 },
    { field: 'deadLetterQueue', type: 'string', min: 1 },
    { field: 'concurrency', type: 'number', min: 1, max: 1000 }
  ];

  const result = Validator.validate(options, rules);
  if (!result.isValid) {
    throw new ConfigurationError(
      `Invalid consumer options: ${result.errors.join(', ')}`
    );
  }
};

// 消息验证
export const validateMessage = <T>(message: Message<T>): void => {
  if (!message || typeof message !== 'object') {
    throw new InvalidMessageError('Message must be an object');
  }

  if (message.payload === undefined) {
    throw new InvalidMessageError('Message payload is required');
  }

  if (message.id !== undefined && typeof message.id !== 'string') {
    throw new InvalidMessageError('Message id must be a string');
  }

  if (message.priority !== undefined) {
    if (
      typeof message.priority !== 'number' ||
      message.priority < 0 ||
      message.priority > 9
    ) {
      throw new InvalidMessageError(
        'Message priority must be a number between 0 and 9'
      );
    }
  }

  if (message.delay !== undefined) {
    if (typeof message.delay !== 'number' || message.delay < 0) {
      throw new InvalidMessageError(
        'Message delay must be a non-negative number'
      );
    }
  }

  if (message.headers !== undefined) {
    if (typeof message.headers !== 'object' || Array.isArray(message.headers)) {
      throw new InvalidMessageError('Message headers must be an object');
    }
  }

  if (message.timestamp !== undefined) {
    if (typeof message.timestamp !== 'number' || message.timestamp < 0) {
      throw new InvalidMessageError(
        'Message timestamp must be a non-negative number'
      );
    }
  }

  if (message.retryCount !== undefined) {
    if (typeof message.retryCount !== 'number' || message.retryCount < 0) {
      throw new InvalidMessageError(
        'Message retryCount must be a non-negative number'
      );
    }
  }

  if (message.maxRetries !== undefined) {
    if (typeof message.maxRetries !== 'number' || message.maxRetries < 0) {
      throw new InvalidMessageError(
        'Message maxRetries must be a non-negative number'
      );
    }
  }
};

// 队列名称验证
export const validateQueueName = (name: string): void => {
  if (!name || typeof name !== 'string') {
    throw new InvalidMessageError('Queue name must be a non-empty string');
  }

  if (name.length < 1 || name.length > 255) {
    throw new InvalidMessageError(
      'Queue name must be between 1 and 255 characters'
    );
  }

  // 队列名称只能包含字母、数字、下划线、连字符和点号
  const pattern = /^[a-zA-Z0-9_.-]+$/;
  if (!pattern.test(name)) {
    throw new InvalidMessageError(
      'Queue name can only contain letters, numbers, underscores, hyphens, and dots'
    );
  }

  // 不能以点号开头或结尾
  if (name.startsWith('.') || name.endsWith('.')) {
    throw new InvalidMessageError('Queue name cannot start or end with a dot');
  }
};

// Redis节点验证
export const validateRedisNode = (node: {
  host: string;
  port: number;
}): void => {
  if (!node || typeof node !== 'object') {
    throw new ConfigurationError('Redis node must be an object');
  }

  if (!node.host || typeof node.host !== 'string') {
    throw new ConfigurationError('Redis node host must be a non-empty string');
  }

  if (
    !node.port ||
    typeof node.port !== 'number' ||
    node.port < 1 ||
    node.port > 65535
  ) {
    throw new ConfigurationError(
      'Redis node port must be a number between 1 and 65535'
    );
  }
};

// 批量验证
export const validateBatch = <T>(
  items: T[],
  validator: (item: T) => void
): void => {
  if (!Array.isArray(items)) {
    throw new InvalidMessageError('Items must be an array');
  }

  if (items.length === 0) {
    throw new InvalidMessageError('Items array cannot be empty');
  }

  items.forEach((item, index) => {
    try {
      validator(item);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InvalidMessageError(`Item at index ${index}: ${errorMessage}`);
    }
  });
};
