/**
 * 配置架构定义
 */
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { StratixConfig } from '../types/config.js';

// 创建 Ajv 实例
const ajv = new Ajv.default({
  allErrors: true,
  useDefaults: true,
  coerceTypes: true
});

// 添加格式验证
addFormats.default(ajv);

/**
 * 日志配置架构
 */
const loggerSchema = {
  type: 'object',
  properties: {
    level: {
      type: 'string',
      enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
      default: 'info'
    },
    pretty: {
      type: 'boolean',
      default: false
    },
    file: {
      type: ['string', 'null']
    },
    redact: {
      type: 'array',
      items: {
        type: 'string'
      },
      default: []
    },
    serializers: {
      type: 'object',
      default: {}
    },
    transport: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        options: { type: 'object' }
      },
      required: ['target']
    }
  }
};

/**
 * 应用配置架构
 */
const appSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+'
    },
    environment: {
      type: 'string',
      default: 'development',
      enum: ['development', 'test', 'production']
    }
  },
  required: ['name', 'version'],
  additionalProperties: true
};

/**
 * 插件配置架构
 */
const pluginsSchema = {
  type: 'object',
  additionalProperties: true
};

/**
 * 路由配置架构
 */
const routeSchema = {
  type: 'object',
  properties: {
    method: {
      oneOf: [
        { type: 'string' },
        {
          type: 'array',
          items: { type: 'string' }
        }
      ]
    },
    path: { type: 'string' },
    handler: { type: ['string', 'object', 'array'] },
    config: { type: 'object' },
    schema: { type: 'object' }
  },
  required: ['method', 'path', 'handler']
};

/**
 * Stratix配置架构
 */
export const stratixConfigSchema = {
  type: 'object',
  properties: {
    app: appSchema,
    plugins: pluginsSchema,
    logger: loggerSchema,
    routes: {
      type: 'array',
      items: routeSchema,
      default: []
    }
  },
  required: ['app'],
  additionalProperties: true
};

/**
 * 验证配置对象
 *
 * @param config 配置对象
 * @returns 验证结果，包含错误信息
 */
export function validateConfig(config: StratixConfig): {
  valid: boolean;
  errors: string[];
} {
  const validate = ajv.compile(stratixConfigSchema);
  const valid = validate(config);

  if (!valid && validate.errors) {
    const errors = validate.errors.map(
      (error: ErrorObject) => `${error.instancePath} ${error.message}`
    );
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

const schema = {
  validateConfig,
  stratixConfigSchema
};

export default schema;
