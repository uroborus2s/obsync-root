/**
 * @stratix/queue 智能背压管理器
 */

import type { Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
import type {
  BackpressureActivatedEvent,
  BackpressureAdjustedEvent,
  BackpressureConfig,
  BackpressureDeactivatedEvent,
  BackpressureState,
  WaterMarkLevel
} from '../types/index.js';

/**
 * 智能背压管理器
 * 根据队列水位自动调节处理速度，防止系统过载
 */
export class SmartBackpressureManager extends EventEmitter {
  private isActive = false;
  private currentLevel: WaterMarkLevel = 'empty';
  private currentMultiplier = 1.0;
  private adjustmentTimeout: NodeJS.Timeout | null = null;
  private activationTimeout: NodeJS.Timeout | null = null;
  private deactivationTimeout: NodeJS.Timeout | null = null;
  private config: BackpressureConfig = {
    enabled: false, // 简化配置，默认关闭背压
    startStreamDelay: 1000,
    stopStreamDelay: 2000,
    minStreamDuration: 5000,
    cooldownPeriod: 3000,
    activationDelay: 500,
    deactivationDelay: 1000,
    adjustmentInterval: 2000,
    highMultiplier: 0.7,
    criticalMultiplier: 0.5
  };

  constructor(private log: Logger) {
    super();
  }

  /**
   * 处理水位变化
   */
  handleWaterMarkChange(level: WaterMarkLevel, queueLength: number): void {
    const previousLevel = this.currentLevel;
    this.currentLevel = level;

    this.log.debug(
      {
        previousLevel,
        currentLevel: level,
        queueLength,
        isActive: this.isActive,
        currentMultiplier: this.currentMultiplier
      },
      '处理水位变化'
    );

    // 根据水位级别决定是否激活背压
    this.evaluateBackpressureActivation(level, queueLength);

    // 如果背压已激活，调整处理速度
    if (this.isActive) {
      this.adjustProcessingSpeed(level, queueLength);
    }
  }

  /**
   * 评估是否需要激活或停用背压
   */
  private evaluateBackpressureActivation(
    level: WaterMarkLevel,
    queueLength: number
  ): void {
    const shouldActivate = this.shouldActivateBackpressure(level);
    const shouldDeactivate = this.shouldDeactivateBackpressure(level);

    if (shouldActivate && !this.isActive) {
      this.scheduleActivation(level, queueLength);
    } else if (shouldDeactivate && this.isActive) {
      this.scheduleDeactivation(level, queueLength);
    }
  }

  /**
   * 判断是否应该激活背压
   */
  private shouldActivateBackpressure(level: WaterMarkLevel): boolean {
    return level === 'high' || level === 'critical';
  }

  /**
   * 判断是否应该停用背压
   */
  private shouldDeactivateBackpressure(level: WaterMarkLevel): boolean {
    return level === 'empty' || level === 'low' || level === 'normal';
  }

  /**
   * 调度背压激活
   */
  private scheduleActivation(level: WaterMarkLevel, queueLength: number): void {
    // 清除之前的调度
    if (this.activationTimeout) {
      clearTimeout(this.activationTimeout);
    }

    // 根据水位级别设置不同的激活延迟
    const delay = level === 'critical' ? 0 : this.config.activationDelay;

    this.activationTimeout = setTimeout(() => {
      this.activateBackpressure(level, queueLength);
    }, delay);
  }

  /**
   * 调度背压停用
   */
  private scheduleDeactivation(
    level: WaterMarkLevel,
    queueLength: number
  ): void {
    // 清除之前的调度
    if (this.deactivationTimeout) {
      clearTimeout(this.deactivationTimeout);
    }

    this.deactivationTimeout = setTimeout(() => {
      this.deactivateBackpressure(level, queueLength);
    }, this.config.deactivationDelay);
  }

  /**
   * 激活背压
   */
  private activateBackpressure(
    level: WaterMarkLevel,
    queueLength: number
  ): void {
    if (this.isActive) return;

    this.isActive = true;
    this.currentMultiplier = this.calculateInitialMultiplier(level);

    const event: BackpressureActivatedEvent = {
      timestamp: new Date(),
      eventId: `backpressure-activated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      queueLength,
      multiplier: this.currentMultiplier,
      reason: `队列水位达到 ${level} 级别`
    };

    this.log.warn(
      {
        level,
        queueLength,
        multiplier: this.currentMultiplier,
        reason: event.reason
      },
      '🚨 背压已激活'
    );

    this.emit('backpressure:activated', event);
  }

  /**
   * 停用背压
   */
  private deactivateBackpressure(
    level: WaterMarkLevel,
    queueLength: number
  ): void {
    if (!this.isActive) return;

    const previousMultiplier = this.currentMultiplier;
    this.isActive = false;
    this.currentMultiplier = 1.0;

    // 清除调整定时器
    if (this.adjustmentTimeout) {
      clearTimeout(this.adjustmentTimeout);
      this.adjustmentTimeout = null;
    }

    const event: BackpressureDeactivatedEvent = {
      timestamp: new Date(),
      eventId: `backpressure-deactivated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      queueLength,
      previousMultiplier,
      reason: `队列水位降至 ${level} 级别`
    };

    this.log.info(
      {
        level,
        queueLength,
        previousMultiplier,
        reason: event.reason
      },
      '✅ 背压已停用'
    );

    this.emit('backpressure:deactivated', event);
  }

  /**
   * 调整处理速度
   */
  private adjustProcessingSpeed(
    level: WaterMarkLevel,
    queueLength: number
  ): void {
    // 清除之前的调整定时器
    if (this.adjustmentTimeout) {
      clearTimeout(this.adjustmentTimeout);
    }

    this.adjustmentTimeout = setTimeout(() => {
      const newMultiplier = this.calculateSpeedMultiplier(level, queueLength);

      if (Math.abs(newMultiplier - this.currentMultiplier) > 0.05) {
        const previousMultiplier = this.currentMultiplier;
        this.currentMultiplier = newMultiplier;

        const event: BackpressureAdjustedEvent = {
          timestamp: new Date(),
          eventId: `backpressure-adjusted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          level,
          queueLength,
          previousMultiplier,
          newMultiplier,
          adjustment: newMultiplier - previousMultiplier
        };

        this.log.debug(
          {
            level,
            queueLength,
            previousMultiplier,
            newMultiplier,
            adjustment: event.adjustment
          },
          '⚡ 背压速度已调整'
        );

        this.emit('backpressure:adjusted', event);
      }
    }, this.config.adjustmentInterval);
  }

  /**
   * 计算初始速度倍数
   */
  private calculateInitialMultiplier(level: WaterMarkLevel): number {
    switch (level) {
      case 'critical':
        return this.config.criticalMultiplier;
      case 'high':
        return this.config.highMultiplier;
      default:
        return 1.0;
    }
  }

  /**
   * 计算速度倍数
   */
  private calculateSpeedMultiplier(
    level: WaterMarkLevel,
    queueLength: number
  ): number {
    switch (level) {
      case 'critical':
        // 临界状态：大幅降低处理速度
        return Math.max(this.config.criticalMultiplier, 0.1);

      case 'high':
        // 高水位：适度降低处理速度
        return Math.max(this.config.highMultiplier, 0.3);

      case 'normal':
        // 正常水位：逐渐恢复处理速度
        return Math.min(this.currentMultiplier + 0.1, 1.0);

      case 'low':
        // 低水位：快速恢复处理速度
        return Math.min(this.currentMultiplier + 0.2, 1.0);

      case 'empty':
        // 空队列：完全恢复处理速度
        return 1.0;

      default:
        return this.currentMultiplier;
    }
  }

  /**
   * 获取当前背压状态
   */
  getState(): BackpressureState {
    return {
      isActive: this.isActive,
      currentLevel: this.currentLevel,
      multiplier: this.currentMultiplier,
      config: { ...this.config }
    };
  }

  /**
   * 检查背压是否激活
   */
  get isBackpressureActive(): boolean {
    return this.isActive;
  }

  /**
   * 获取当前速度倍数
   */
  get speedMultiplier(): number {
    return this.currentMultiplier;
  }

  /**
   * 获取当前水位级别
   */
  get waterMarkLevel(): WaterMarkLevel {
    return this.currentLevel;
  }

  /**
   * 手动激活背压
   */
  forceActivate(reason: string = '手动激活'): void {
    if (this.isActive) return;

    this.isActive = true;
    this.currentMultiplier = this.config.highMultiplier;

    const event: BackpressureActivatedEvent = {
      timestamp: new Date(),
      eventId: `backpressure-force-activated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level: this.currentLevel,
      queueLength: 0, // 手动激活时可能没有队列长度信息
      multiplier: this.currentMultiplier,
      reason
    };

    this.log.warn(
      {
        level: this.currentLevel,
        multiplier: this.currentMultiplier,
        reason
      },
      '🚨 背压手动激活'
    );

    this.emit('backpressure:activated', event);
  }

  /**
   * 手动停用背压
   */
  forceDeactivate(reason: string = '手动停用'): void {
    if (!this.isActive) return;

    const previousMultiplier = this.currentMultiplier;
    this.isActive = false;
    this.currentMultiplier = 1.0;

    // 清除所有定时器
    if (this.adjustmentTimeout) {
      clearTimeout(this.adjustmentTimeout);
      this.adjustmentTimeout = null;
    }

    const event: BackpressureDeactivatedEvent = {
      timestamp: new Date(),
      eventId: `backpressure-force-deactivated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level: this.currentLevel,
      queueLength: 0,
      previousMultiplier,
      reason
    };

    this.log.info(
      {
        level: this.currentLevel,
        previousMultiplier,
        reason
      },
      '✅ 背压手动停用'
    );

    this.emit('backpressure:deactivated', event);
  }

  /**
   * 更新背压配置
   */
  updateConfig(newConfig: Partial<BackpressureConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log.info({ config: this.config }, '背压配置已更新');
  }

  /**
   * 重置背压状态
   */
  reset(): void {
    // 清除所有定时器
    if (this.adjustmentTimeout) {
      clearTimeout(this.adjustmentTimeout);
      this.adjustmentTimeout = null;
    }
    if (this.activationTimeout) {
      clearTimeout(this.activationTimeout);
      this.activationTimeout = null;
    }
    if (this.deactivationTimeout) {
      clearTimeout(this.deactivationTimeout);
      this.deactivationTimeout = null;
    }

    // 重置状态
    this.isActive = false;
    this.currentLevel = 'empty';
    this.currentMultiplier = 1.0;

    this.log.info('背压管理器已重置');
  }

  /**
   * 销毁背压管理器
   */
  destroy(): void {
    this.reset();
    this.removeAllListeners();
    this.log.info('背压管理器已销毁');
  }
}
