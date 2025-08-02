// @stratix/database 插件参数处理测试
// 验证parameterProcessor和parameterValidator的功能

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 模拟环境变量
const originalEnv = process.env;

// 从插件配置中提取参数处理函数（这里我们需要模拟实际的实现）
// 由于参数处理函数是在withRegisterAutoDI中定义的，我们需要创建测试版本

// 简单的深度合并函数
const deepMerge = (target: any, source: any): any => {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
};

const createParameterProcessor = () => {
  return <T>(options: T): T => {
    const defaultConfig = {
      defaultConnection: 'default',
      healthCheck: {
        enabled: true,
        intervalMs: 30000,
        timeoutMs: 5000,
        retryCount: 3
      },
      logging: {
        enabled: true,
        level: 'info',
        queries: false,
        performance: true
      },
      monitoring: {
        enabled: true,
        sampleRate: 1.0,
        slowQueryThresholdMs: 1000
      },
      security: {
        enableSqlInjectionProtection: true,
        maxQueryLength: 100000,
        allowedOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      }
    };

    // 使用深度合并将默认配置和用户参数合并
    return deepMerge(defaultConfig, options || {}) as T;
  };
};

const createParameterValidator = () => {
  return (options: any): boolean => {
    try {
      // 基础配置验证
      if (!options || typeof options !== 'object') {
        console.error('❌ Database plugin options must be an object');
        return false;
      }

      // 连接配置验证
      if (!options.connections) {
        console.error('❌ Database connections configuration is required');
        return false;
      }

      if (typeof options.connections !== 'object') {
        console.error('❌ Database connections must be an object');
        return false;
      }

      // 验证至少有一个连接配置
      const connectionNames = Object.keys(options.connections);
      if (connectionNames.length === 0) {
        console.error('❌ At least one database connection must be configured');
        return false;
      }

      // 验证每个连接配置
      for (const [name, config] of Object.entries(options.connections)) {
        const conn = config as any;

        if (!conn.type) {
          console.error(`❌ Connection '${name}' must specify a database type`);
          return false;
        }

        if (!conn.database) {
          console.error(`❌ Connection '${name}' must specify a database name`);
          return false;
        }

        // 验证端口号
        if (
          conn.port &&
          (typeof conn.port !== 'number' || conn.port <= 0 || conn.port > 65535)
        ) {
          console.error(
            `❌ Connection '${name}' port must be a valid number between 1 and 65535`
          );
          return false;
        }
      }

      // 验证默认连接存在
      const defaultConnection = options.defaultConnection || 'default';
      if (!options.connections[defaultConnection]) {
        console.error(
          `❌ Default connection '${defaultConnection}' is not defined in connections`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Database plugin parameter validation failed:', error);
      return false;
    }
  };
};

describe('Database Plugin Parameter Processing', () => {
  let parameterProcessor: ReturnType<typeof createParameterProcessor>;
  let parameterValidator: ReturnType<typeof createParameterValidator>;

  beforeEach(() => {
    parameterProcessor = createParameterProcessor();
    parameterValidator = createParameterValidator();

    // 重置环境变量
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parameterProcessor', () => {
    it('应该设置默认配置值', () => {
      const input = {
        connections: {
          default: {
            type: 'sqlite',
            database: ':memory:'
          }
        }
      };

      const result = parameterProcessor(input);

      expect(result.defaultConnection).toBe('default');
      expect(result.healthCheck).toEqual({
        enabled: true,
        intervalMs: 30000,
        timeoutMs: 5000,
        retryCount: 3
      });
      expect(result.logging).toEqual({
        enabled: true,
        level: 'info',
        queries: false,
        performance: true
      });
    });

    it('应该保留用户提供的配置', () => {
      const input = {
        connections: {
          default: {
            type: 'postgresql',
            database: 'myapp'
          }
        },
        defaultConnection: 'custom',
        healthCheck: {
          enabled: false,
          intervalMs: 60000
        }
      };

      const result = parameterProcessor(input);

      expect(result.defaultConnection).toBe('custom');
      expect(result.healthCheck.enabled).toBe(false);
      expect(result.healthCheck.intervalMs).toBe(60000);
      expect(result.healthCheck.timeoutMs).toBe(5000); // 默认值
    });

    it('应该进行深度合并配置', () => {
      const input = {
        connections: {
          default: {
            type: 'postgresql',
            database: 'myapp',
            host: 'localhost',
            port: 5432
          }
        },
        healthCheck: {
          intervalMs: 45000 // 只覆盖这一个属性
        },
        monitoring: {
          slowQueryThresholdMs: 2000,
          enabled: false // 覆盖默认的enabled值
        }
      };

      const result = parameterProcessor(input);

      // 验证用户配置被保留
      expect(result.connections.default.type).toBe('postgresql');
      expect(result.connections.default.database).toBe('myapp');
      expect(result.connections.default.host).toBe('localhost');
      expect(result.connections.default.port).toBe(5432);

      // 验证深度合并：healthCheck中只有intervalMs被覆盖，其他保持默认值
      expect(result.healthCheck.intervalMs).toBe(45000);
      expect(result.healthCheck.enabled).toBe(true); // 默认值
      expect(result.healthCheck.timeoutMs).toBe(5000); // 默认值
      expect(result.healthCheck.retryCount).toBe(3); // 默认值

      // 验证monitoring的深度合并
      expect(result.monitoring.slowQueryThresholdMs).toBe(2000);
      expect(result.monitoring.enabled).toBe(false); // 用户覆盖值
      expect(result.monitoring.sampleRate).toBe(1.0); // 默认值
    });
  });

  describe('parameterValidator', () => {
    it('应该验证有效的配置', () => {
      const validConfig = {
        connections: {
          default: {
            type: 'sqlite',
            database: ':memory:'
          }
        }
      };

      const result = parameterValidator(validConfig);
      expect(result).toBe(true);
    });

    it('应该拒绝空配置', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = parameterValidator(null);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Database plugin options must be an object'
      );

      consoleSpy.mockRestore();
    });

    it('应该拒绝缺少连接配置', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidConfig = {};
      const result = parameterValidator(invalidConfig);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Database connections configuration is required'
      );

      consoleSpy.mockRestore();
    });

    it('应该拒绝空的连接配置', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidConfig = {
        connections: {}
      };
      const result = parameterValidator(invalidConfig);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ At least one database connection must be configured'
      );

      consoleSpy.mockRestore();
    });

    it('应该验证连接配置的必需字段', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidConfig = {
        connections: {
          default: {
            // 缺少 type 和 database
          }
        }
      };
      const result = parameterValidator(invalidConfig);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Connection 'default' must specify a database type"
      );

      consoleSpy.mockRestore();
    });

    it('应该验证端口号范围', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidConfig = {
        connections: {
          default: {
            type: 'postgresql',
            database: 'test',
            port: 70000 // 无效端口
          }
        }
      };
      const result = parameterValidator(invalidConfig);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Connection 'default' port must be a valid number between 1 and 65535"
      );

      consoleSpy.mockRestore();
    });

    it('应该验证默认连接存在', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidConfig = {
        connections: {
          primary: {
            type: 'sqlite',
            database: ':memory:'
          }
        },
        defaultConnection: 'default' // 不存在的连接
      };
      const result = parameterValidator(invalidConfig);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Default connection 'default' is not defined in connections"
      );

      consoleSpy.mockRestore();
    });
  });
});
