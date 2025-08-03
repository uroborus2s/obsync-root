/**
 * 执行器工厂服务
 *
 * 负责创建和管理内置执行器实例
 */

import type { Schema } from 'ajv';
import Ajv from 'ajv';
import type {
  BuiltInExecutorType,
  EmailExecutorConfig,
  ExecutorFactory,
  HttpExecutorConfig,
  ScriptExecutorConfig,
  TaskExecutor
} from '../types/executor.js';

// 使用简单的 console 作为日志器，避免循环依赖
const logger = console;

/**
 * HTTP 执行器
 */
class HttpExecutor implements TaskExecutor {
  readonly name = 'http';
  readonly description = 'HTTP request executor';
  readonly version = '1.0.0';

  // HTTP 执行器的配置 Schema
  readonly configSchema: Schema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        format: 'uri',
        description: '请求URL'
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET',
        description: 'HTTP方法'
      },
      headers: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: '请求头'
      },
      body: {
        description: '请求体'
      },
      timeout: {
        type: 'number',
        minimum: 1000,
        maximum: 300000,
        default: 30000,
        description: '超时时间（毫秒）'
      }
    },
    required: ['url'],
    additionalProperties: false
  };

  private ajv = new (Ajv as any)({ allErrors: true });

  /**
   * 验证配置
   */
  validateConfig(config: any) {
    const validate = this.ajv.compile(this.configSchema);
    const valid = validate(config);

    return {
      valid,
      errors: valid
        ? []
        : validate.errors?.map(
            (err: any) => `${err.instancePath || 'root'} ${err.message}`
          ) || []
    };
  }

  async execute(context: any): Promise<any> {
    const config = context.config as HttpExecutorConfig;
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = config;

    try {
      const requestInit: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: AbortSignal.timeout(timeout)
      };

      // 只有在有 body 时才添加 body 属性
      if (body) {
        requestInit.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestInit);

      const data = await response.json();

      return {
        success: response.ok,
        data,
        duration: 0 // TODO: 计算实际执行时间
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        shouldRetry: error instanceof Error && error.name === 'TimeoutError'
      };
    }
  }
}

/**
 * 脚本执行器
 */
class ScriptExecutor implements TaskExecutor {
  readonly name = 'script';
  readonly description = 'Script execution executor';
  readonly version = '1.0.0';

  async execute(context: any): Promise<any> {
    const config = context.config as ScriptExecutorConfig;
    const { language, script, env = {}, timeout = 30000 } = config;

    try {
      if (language === 'javascript') {
        // 在安全的上下文中执行 JavaScript
        const func = new Function('context', 'env', script);
        const result = await Promise.race([
          func(context, env),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Script timeout')), timeout)
          )
        ]);

        return {
          success: true,
          data: result
        };
      } else {
        throw new Error(`Unsupported script language: ${language}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  validateConfig(config: any): any {
    const errors: string[] = [];

    if (!config.script || typeof config.script !== 'string') {
      errors.push('Script is required and must be a string');
    }

    if (
      !config.language ||
      !['javascript', 'typescript', 'python', 'shell'].includes(config.language)
    ) {
      errors.push(
        'Language is required and must be one of: javascript, typescript, python, shell'
      );
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 邮件执行器
 */
class EmailExecutor implements TaskExecutor {
  readonly name = 'email';
  readonly description = 'Email sending executor';
  readonly version = '1.0.0';

  async execute(context: any): Promise<any> {
    const config = context.config as EmailExecutorConfig;
    const { to, subject, body } = config;

    try {
      // 这里应该集成实际的邮件发送服务
      // 目前只是模拟
      context.logger.info(`Sending email to ${to}: ${subject}`);
      context.logger.debug(`Email body: ${body}`);

      return {
        success: true,
        data: {
          messageId: `msg_${Date.now()}`,
          recipients: Array.isArray(to) ? to : [to],
          subject,
          bodyLength: body?.length || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  validateConfig(config: any): any {
    const errors: string[] = [];

    if (!config.to) {
      errors.push('Recipient (to) is required');
    }

    if (!config.subject || typeof config.subject !== 'string') {
      errors.push('Subject is required and must be a string');
    }

    if (!config.body || typeof config.body !== 'string') {
      errors.push('Body is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 延迟执行器
 */
class DelayExecutor implements TaskExecutor {
  readonly name = 'delay';
  readonly description = 'Delay execution executor';
  readonly version = '1.0.0';

  async execute(context: any): Promise<any> {
    const { duration = 1000 } = context.config;

    try {
      await new Promise((resolve) => setTimeout(resolve, duration));

      return {
        success: true,
        data: {
          delayed: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  validateConfig(config: any): any {
    const errors: string[] = [];

    if (
      config.duration &&
      (typeof config.duration !== 'number' || config.duration < 0)
    ) {
      errors.push('Duration must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 日志执行器
 */
class LogExecutor implements TaskExecutor {
  readonly name = 'log';
  readonly description = 'Logging executor';
  readonly version = '1.0.0';

  async execute(context: any): Promise<any> {
    const { message, level = 'info', data } = context.config;

    try {
      const logMessage =
        typeof message === 'string' ? message : JSON.stringify(message);

      switch (level) {
        case 'debug':
          context.logger.debug(logMessage, data);
          break;
        case 'info':
          context.logger.info(logMessage, data);
          break;
        case 'warn':
          context.logger.warn(logMessage, data);
          break;
        case 'error':
          context.logger.error(logMessage, data);
          break;
        default:
          context.logger.info(logMessage, data);
      }

      return {
        success: true,
        data: {
          logged: true,
          level,
          message: logMessage
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  validateConfig(config: any): any {
    const errors: string[] = [];

    if (!config.message) {
      errors.push('Message is required');
    }

    if (
      config.level &&
      !['debug', 'info', 'warn', 'error'].includes(config.level)
    ) {
      errors.push('Level must be one of: debug, info, warn, error');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 执行器工厂服务实现
 */
export class ExecutorFactoryService implements ExecutorFactory {
  private readonly logger = logger;
  private readonly executorClasses = new Map<
    BuiltInExecutorType,
    new () => TaskExecutor
  >();

  constructor() {
    // 注册内置执行器类
    this.executorClasses.set('http', HttpExecutor);
    this.executorClasses.set('script', ScriptExecutor);
    this.executorClasses.set('email', EmailExecutor);
    this.executorClasses.set('delay', DelayExecutor);
    this.executorClasses.set('log', LogExecutor);
  }

  /**
   * 创建执行器实例
   * @param name 执行器名称
   * @param config 配置参数
   * @returns 执行器实例
   */
  createExecutor(name: string, config?: any): TaskExecutor {
    const ExecutorClass = this.executorClasses.get(name as BuiltInExecutorType);

    if (!ExecutorClass) {
      throw new Error(`Unknown built-in executor type: ${name}`);
    }

    const executor = new ExecutorClass();

    // 如果提供了配置，进行验证
    if (config && executor.validateConfig) {
      const validation = executor.validateConfig(config);
      if (!validation.valid) {
        throw new Error(
          `Invalid executor configuration: ${validation.errors?.join(', ')}`
        );
      }
    }

    this.logger.debug(`Created executor instance: ${name}`);
    return executor;
  }

  /**
   * 获取支持的执行器类型
   * @returns 执行器类型列表
   */
  getSupportedTypes(): string[] {
    return Array.from(this.executorClasses.keys());
  }

  /**
   * 批量创建执行器
   * @param configs 执行器配置映射
   * @returns 执行器实例映射
   */
  createExecutors(
    configs: Record<string, { type: BuiltInExecutorType; config?: any }>
  ): Record<string, TaskExecutor> {
    const executors: Record<string, TaskExecutor> = {};

    Object.entries(configs).forEach(([name, { type, config }]) => {
      try {
        executors[name] = this.createExecutor(type, config);
      } catch (error) {
        this.logger.error(`Failed to create executor ${name}:`, error);
        throw error;
      }
    });

    return executors;
  }
}
