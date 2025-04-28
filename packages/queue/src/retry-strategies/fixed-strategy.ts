/**
 * 固定间隔重试策略
 * 每次重试使用相同的延迟时间
 */

import { AbstractRetryStrategy } from './abstract-strategy.js';

/**
 * 固定间隔重试策略
 * 每次重试使用相同的延迟时间
 */
export class FixedRetryStrategy extends AbstractRetryStrategy {
  /**
   * 策略类型名称
   */
  private static readonly TYPE = 'fixed';

  /**
   * 固定延迟时间（毫秒）
   */
  private readonly delay: number;

  /**
   * 构造函数
   * @param delay 固定延迟时间（毫秒）
   */
  constructor(delay: number) {
    super();
    this.delay = Math.max(0, delay); // 确保延迟时间不为负数
  }

  /**
   * 获取重试延迟时间（毫秒）
   * @param attemptsMade 已经尝试的次数（对于固定策略不影响结果）
   * @returns 固定的延迟时间（毫秒）
   */
  public getDelay(attemptsMade: number): number {
    return this.delay;
  }

  /**
   * 获取策略类型
   * @returns 策略类型名称
   */
  public getType(): string {
    return FixedRetryStrategy.TYPE;
  }
}
