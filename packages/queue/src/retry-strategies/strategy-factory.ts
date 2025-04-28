/**
 * 重试策略工厂
 * 根据配置创建合适的重试策略实例
 */

import { BackoffOptions } from '../types/index.js';
import { RetryStrategy } from './abstract-strategy.js';
import { CustomRetryStrategy, DelayCalculator } from './custom-strategy.js';
import { ExponentialRetryStrategy } from './exponential-strategy.js';
import { FixedRetryStrategy } from './fixed-strategy.js';

/**
 * 重试策略工厂
 * 负责创建和管理重试策略实例
 */
export class RetryStrategyFactory {
  /**
   * 根据配置创建重试策略
   * @param options 重试策略配置
   * @returns 重试策略实例
   */
  public static create(options: BackoffOptions): RetryStrategy {
    if (!options) {
      // 如果没有提供配置，默认使用固定延迟策略（1秒）
      return new FixedRetryStrategy(1000);
    }

    if (typeof options.custom === 'function') {
      // 如果提供了自定义计算函数，使用自定义策略
      return new CustomRetryStrategy(options.custom as DelayCalculator);
    }

    // 根据配置的策略类型创建对应的策略实例
    switch (options.type) {
      case 'exponential':
        return new ExponentialRetryStrategy(options.delay || 1000);

      case 'fixed':
      default:
        return new FixedRetryStrategy(options.delay || 1000);
    }
  }

  /**
   * 根据配置创建重试策略（从插件配置格式转换）
   * @param backoff 插件配置中的重试策略配置
   * @returns 重试策略实例
   */
  public static createFromBackoff(backoff: any): RetryStrategy {
    // 如果没有提供配置，默认使用固定延迟策略（1秒）
    if (!backoff) {
      return new FixedRetryStrategy(1000);
    }

    // 处理不同格式的配置
    if (typeof backoff === 'number') {
      // 如果是数字，视为固定延迟时间
      return new FixedRetryStrategy(backoff);
    } else if (typeof backoff === 'object') {
      // 对象格式配置转换为标准选项
      const options: BackoffOptions = {
        type: backoff.type || 'fixed',
        delay: backoff.delay || 1000
      };

      if (backoff.custom) {
        options.custom = backoff.custom;
      }

      return this.create(options);
    }

    // 默认使用固定延迟策略（1秒）
    return new FixedRetryStrategy(1000);
  }
}
