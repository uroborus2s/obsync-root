/**
 * 深度合并参数处理测试
 * 验证 processPluginParameters 函数的深度合并功能
 */

import { deepMerge } from '@stratix/utils/data';
import { isDevelopment } from '@stratix/utils/environment';
import { describe, expect, it } from 'vitest';

// 模拟 DEFAULT_EXECUTOR_PARAMETERS
const DEFAULT_EXECUTOR_PARAMETERS = {
  timeout: 300000,
  maxRetries: 3,
  retryDelay: 5000,
  enableVerboseLogging: isDevelopment(),
  tags: ['stratix-tasks'],
  version: '1.0.0',
  healthCheck: {
    enabled: true,
    interval: 60000,
    timeout: 10000
  },
  monitoring: {
    enabled: true,
    metricsCollection: true,
    performanceTracking: true
  },
  errorHandling: {
    strategy: 'retry' as const,
    logErrors: true,
    notifyOnFailure: false
  }
};

// 模拟 processPluginParameters 函数的核心逻辑
function processPluginParameters<T>(options: T): T {
  if (!options || typeof options !== 'object') {
    return options;
  }

  const defaultConfig = {
    executors: {
      enableBuiltIn: true,
      customPath: './executors',
      defaultParameters: DEFAULT_EXECUTOR_PARAMETERS
    },
    scheduler: {
      enabled: true,
      interval: 1000,
      maxConcurrency: 100,
      executorDefaults: {
        timeout: DEFAULT_EXECUTOR_PARAMETERS.timeout,
        maxRetries: DEFAULT_EXECUTOR_PARAMETERS.maxRetries,
        retryDelay: DEFAULT_EXECUTOR_PARAMETERS.retryDelay
      }
    },
    monitoring: {
      enabled: DEFAULT_EXECUTOR_PARAMETERS.monitoring.enabled,
      metricsInterval: 30000,
      logLevel: isDevelopment() ? 'debug' : 'info',
      executorMonitoring: {
        healthCheckInterval: DEFAULT_EXECUTOR_PARAMETERS.healthCheck.interval,
        performanceTracking:
          DEFAULT_EXECUTOR_PARAMETERS.monitoring.performanceTracking,
        metricsCollection:
          DEFAULT_EXECUTOR_PARAMETERS.monitoring.metricsCollection
      }
    }
  };

  return deepMerge(defaultConfig, options) as T;
}

describe('深度合并参数处理', () => {
  describe('基础功能测试', () => {
    it('应该正确处理空配置', () => {
      const result = processPluginParameters({});

      expect(result).toHaveProperty('executors');
      expect(result).toHaveProperty('scheduler');
      expect(result).toHaveProperty('monitoring');
      expect(result.executors.enableBuiltIn).toBe(true);
      expect(result.executors.defaultParameters.timeout).toBe(300000);
    });

    it('应该正确处理 null 和 undefined', () => {
      expect(processPluginParameters(null)).toBe(null);
      expect(processPluginParameters(undefined)).toBe(undefined);
      expect(processPluginParameters('string')).toBe('string');
    });
  });

  describe('深度合并测试', () => {
    it('应该深度合并嵌套的执行器配置', () => {
      const userConfig = {
        executors: {
          enableBuiltIn: false,
          defaultParameters: {
            timeout: 600000, // 覆盖默认值
            maxRetries: 5, // 覆盖默认值
            // enableVerboseLogging 保持默认值
            healthCheck: {
              enabled: false // 覆盖默认值
              // interval 和 timeout 保持默认值
            }
          }
        }
      };

      const result = processPluginParameters(userConfig);

      // 验证顶层属性被正确覆盖
      expect(result.executors.enableBuiltIn).toBe(false);
      expect(result.executors.customPath).toBe('./executors'); // 保持默认值

      // 验证深层嵌套属性被正确合并
      expect(result.executors.defaultParameters.timeout).toBe(600000); // 用户值
      expect(result.executors.defaultParameters.maxRetries).toBe(5); // 用户值
      expect(result.executors.defaultParameters.retryDelay).toBe(5000); // 默认值
      expect(result.executors.defaultParameters.enableVerboseLogging).toBe(
        isDevelopment()
      ); // 默认值

      // 验证更深层的嵌套对象合并
      expect(result.executors.defaultParameters.healthCheck.enabled).toBe(
        false
      ); // 用户值
      expect(result.executors.defaultParameters.healthCheck.interval).toBe(
        60000
      ); // 默认值
      expect(result.executors.defaultParameters.healthCheck.timeout).toBe(
        10000
      ); // 默认值
    });

    it('应该深度合并监控配置', () => {
      const userConfig = {
        monitoring: {
          metricsInterval: 60000, // 覆盖默认值
          executorMonitoring: {
            performanceTracking: false // 覆盖默认值
            // healthCheckInterval 和 metricsCollection 保持默认值
          }
        }
      };

      const result = processPluginParameters(userConfig);

      // 验证顶层监控配置
      expect(result.monitoring.enabled).toBe(true); // 默认值
      expect(result.monitoring.metricsInterval).toBe(60000); // 用户值
      expect(result.monitoring.logLevel).toBe(
        isDevelopment() ? 'debug' : 'info'
      ); // 默认值

      // 验证嵌套的执行器监控配置
      expect(result.monitoring.executorMonitoring.performanceTracking).toBe(
        false
      ); // 用户值
      expect(result.monitoring.executorMonitoring.healthCheckInterval).toBe(
        60000
      ); // 默认值
      expect(result.monitoring.executorMonitoring.metricsCollection).toBe(true); // 默认值
    });

    it('应该正确处理数组合并', () => {
      const userConfig = {
        executors: {
          defaultParameters: {
            tags: ['custom-tag', 'user-tag'] // 与默认数组合并
          }
        }
      };

      const result = processPluginParameters(userConfig);

      // 验证数组被合并（deepMerge 的实际行为）
      expect(result.executors.defaultParameters.tags).toContain(
        'stratix-tasks'
      ); // 默认值保留
      expect(result.executors.defaultParameters.tags).toContain('custom-tag'); // 用户值添加
      expect(result.executors.defaultParameters.tags).toContain('user-tag'); // 用户值添加
      expect(result.executors.defaultParameters.tags.length).toBe(3); // 总共3个标签
    });
  });

  describe('配置优先级测试', () => {
    it('用户配置应该优先于默认配置', () => {
      const userConfig = {
        executors: {
          enableBuiltIn: false,
          customPath: '/custom/path',
          defaultParameters: {
            timeout: 900000,
            version: '2.0.0'
          }
        },
        scheduler: {
          enabled: false,
          maxConcurrency: 200,
          executorDefaults: {
            timeout: 1200000
          }
        }
      };

      const result = processPluginParameters(userConfig);

      // 验证用户配置优先
      expect(result.executors.enableBuiltIn).toBe(false);
      expect(result.executors.customPath).toBe('/custom/path');
      expect(result.executors.defaultParameters.timeout).toBe(900000);
      expect(result.executors.defaultParameters.version).toBe('2.0.0');

      expect(result.scheduler.enabled).toBe(false);
      expect(result.scheduler.maxConcurrency).toBe(200);
      expect(result.scheduler.executorDefaults.timeout).toBe(1200000);

      // 验证未指定的配置保持默认值
      expect(result.scheduler.interval).toBe(1000);
      expect(result.scheduler.executorDefaults.maxRetries).toBe(3);
      expect(result.scheduler.executorDefaults.retryDelay).toBe(5000);
    });
  });

  describe('复杂场景测试', () => {
    it('应该正确处理部分配置覆盖', () => {
      const userConfig = {
        executors: {
          defaultParameters: {
            healthCheck: {
              interval: 120000 // 只覆盖 interval
            },
            monitoring: {
              metricsCollection: false // 只覆盖 metricsCollection
            }
          }
        }
      };

      const result = processPluginParameters(userConfig);

      // 验证部分覆盖的效果
      expect(result.executors.defaultParameters.healthCheck.enabled).toBe(true); // 默认值
      expect(result.executors.defaultParameters.healthCheck.interval).toBe(
        120000
      ); // 用户值
      expect(result.executors.defaultParameters.healthCheck.timeout).toBe(
        10000
      ); // 默认值

      expect(result.executors.defaultParameters.monitoring.enabled).toBe(true); // 默认值
      expect(
        result.executors.defaultParameters.monitoring.metricsCollection
      ).toBe(false); // 用户值
      expect(
        result.executors.defaultParameters.monitoring.performanceTracking
      ).toBe(true); // 默认值
    });

    it('应该正确处理新增的配置属性', () => {
      const userConfig = {
        executors: {
          newProperty: 'new-value',
          defaultParameters: {
            customConfig: {
              feature1: true,
              feature2: 'enabled'
            }
          }
        },
        customSection: {
          setting1: 'value1',
          setting2: 42
        }
      };

      const result = processPluginParameters(userConfig);

      // 验证新增属性被保留
      expect(result.executors.newProperty).toBe('new-value');
      expect(result.executors.defaultParameters.customConfig).toEqual({
        feature1: true,
        feature2: 'enabled'
      });
      expect(result.customSection).toEqual({
        setting1: 'value1',
        setting2: 42
      });

      // 验证默认配置仍然存在
      expect(result.executors.enableBuiltIn).toBe(true);
      expect(result.executors.defaultParameters.timeout).toBe(300000);
    });
  });
});
