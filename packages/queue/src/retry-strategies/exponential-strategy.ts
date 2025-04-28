/**
 * 指数退避重试策略
 * 随着重试次数增加，延迟时间按指数增长
 */

import { AbstractRetryStrategy } from './abstract-strategy.js';

/**
 * 指数退避重试策略
 * 随着重试次数增加，延迟时间按指数增长
 */
export class ExponentialRetryStrategy extends AbstractRetryStrategy {
  /**
   * 策略类型名称
   */
  private static readonly TYPE = 'exponential';

  /**
   * 基础延迟时间（毫秒）
   */
  private readonly baseDelay: number;

  /**
   * 最大延迟时间（毫秒），如果为0则无上限
   */
  private readonly maxDelay: number;

  /**
   * 构造函数
   * @param baseDelay 基础延迟时间（毫秒）
   * @param maxDelay 最大延迟时间（毫秒），默认为0（无上限）
   */
  constructor(baseDelay: number, maxDelay: number = 0) {
    super();
    this.baseDelay = Math.max(0, baseDelay); // 确保基础延迟时间不为负数
    this.maxDelay = Math.max(0, maxDelay); // 确保最大延迟时间不为负数
  }

  /**
   * 获取重试延迟时间（毫秒）
   * 使用指数退避算法：baseDelay * 2^(attemptsMade - 1)
   * @param attemptsMade 已经尝试的次数
   * @returns 计算后的延迟时间（毫秒）
   */
  public getDelay(attemptsMade: number): number {
    // 确保尝试次数至少为1
    const attempts = Math.max(1, attemptsMade);

    // 计算指数退避延迟时间
    // 公式：baseDelay * 2^(attempts - 1)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempts - 1);

    // 如果设置了最大延迟时间且大于0，则限制延迟时间不超过最大值
    if (this.maxDelay > 0) {
      return Math.min(exponentialDelay, this.maxDelay);
    }

    return exponentialDelay;
  }

  /**
   * 获取策略类型
   * @returns 策略类型名称
   */
  public getType(): string {
    return ExponentialRetryStrategy.TYPE;
  }
}
