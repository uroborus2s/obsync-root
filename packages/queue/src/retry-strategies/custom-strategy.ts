/**
 * 自定义重试策略
 * 使用自定义回调函数计算重试延迟时间
 */

import { AbstractRetryStrategy } from './abstract-strategy.js';

/**
 * 自定义延迟计算函数类型
 * @param attemptsMade 已经尝试的次数
 * @returns 计算后的延迟时间（毫秒）
 */
export type DelayCalculator = (attemptsMade: number) => number;

/**
 * 自定义重试策略
 * 使用提供的回调函数计算重试延迟时间
 */
export class CustomRetryStrategy extends AbstractRetryStrategy {
  /**
   * 策略类型名称
   */
  private static readonly TYPE = 'custom';

  /**
   * 自定义延迟计算函数
   */
  private readonly calculator: DelayCalculator;

  /**
   * 构造函数
   * @param calculator 自定义延迟计算函数
   */
  constructor(calculator: DelayCalculator) {
    super();

    if (typeof calculator !== 'function') {
      throw new Error('自定义重试策略必须提供有效的延迟计算函数');
    }

    this.calculator = calculator;
  }

  /**
   * 获取重试延迟时间（毫秒）
   * 使用自定义函数计算延迟时间
   * @param attemptsMade 已经尝试的次数
   * @returns 计算后的延迟时间（毫秒）
   */
  public getDelay(attemptsMade: number): number {
    try {
      const delay = this.calculator(attemptsMade);
      // 确保延迟时间不为负数
      return Math.max(0, delay);
    } catch (error) {
      // 如果自定义计算函数抛出错误，返回默认延迟时间（1秒）
      console.error('自定义延迟计算函数执行出错:', error);
      return 1000;
    }
  }

  /**
   * 获取策略类型
   * @returns 策略类型名称
   */
  public getType(): string {
    return CustomRetryStrategy.TYPE;
  }
}
