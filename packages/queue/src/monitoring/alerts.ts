/**
 * 告警系统
 * 提供基于规则的监控告警功能
 */

import { EventEmitter } from 'events';
import type { Metrics } from '../types/index.js';
import { createLogger, Logger, LogLevel } from '../utils/index.js';

/**
 * 告警规则类型
 */
export type AlertRuleType =
  | 'threshold' // 阈值告警
  | 'rate' // 变化率告警
  | 'anomaly' // 异常检测告警
  | 'composite'; // 复合条件告警

/**
 * 告警严重级别
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * 告警状态
 */
export type AlertStatus = 'firing' | 'resolved' | 'pending';

/**
 * 告警规则配置
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  enabled: boolean;

  // 条件配置
  condition: AlertCondition;

  // 触发配置
  evaluationInterval: number; // 评估间隔(ms)
  forDuration: number; // 持续时间(ms)

  // 通知配置
  notifications: AlertNotification[];

  // 抑制配置
  suppressionRules?: AlertSuppressionRule[];
}

/**
 * 告警条件
 */
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  timeWindow?: number; // 时间窗口(ms)
}

/**
 * 告警通知配置
 */
export interface AlertNotification {
  type: 'email' | 'webhook' | 'slack' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * 告警抑制规则
 */
export interface AlertSuppressionRule {
  condition: string; // 抑制条件表达式
  duration: number; // 抑制持续时间(ms)
}

/**
 * 活跃告警
 */
export interface ActiveAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  startTime: number;
  lastEvaluationTime: number;
  resolvedTime?: number;
  metadata: Record<string, any>;
}

/**
 * 告警管理器
 */
export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private evaluationTimers: Map<string, NodeJS.Timeout> = new Map();
  private logger: Logger;
  private isRunning = false;

  constructor() {
    super();
    this.logger = createLogger({ level: LogLevel.INFO, format: 'json' });
    this.logger.setContext({ component: 'AlertManager' });
  }

  /**
   * 启动告警管理器
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting alert manager...');

    // 启动所有启用的规则
    for (const rule of this.rules.values()) {
      if (rule.enabled) {
        this.startRuleEvaluation(rule);
      }
    }

    this.isRunning = true;
    this.emit('started');
  }

  /**
   * 停止告警管理器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping alert manager...');

    // 停止所有规则评估
    for (const timer of this.evaluationTimers.values()) {
      clearInterval(timer);
    }
    this.evaluationTimers.clear();

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * 添加告警规则
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info(`Added alert rule: ${rule.name} (${rule.id})`);

    if (this.isRunning && rule.enabled) {
      this.startRuleEvaluation(rule);
    }

    this.emit('rule-added', rule);
  }

  /**
   * 移除告警规则
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return;
    }

    this.rules.delete(ruleId);
    this.stopRuleEvaluation(ruleId);

    // 解决相关的活跃告警
    for (const alert of this.activeAlerts.values()) {
      if (alert.ruleId === ruleId) {
        this.resolveAlert(alert.id);
      }
    }

    this.logger.info(`Removed alert rule: ${rule.name} (${ruleId})`);
    this.emit('rule-removed', rule);
  }

  /**
   * 更新告警规则
   */
  updateRule(rule: AlertRule): void {
    const existingRule = this.rules.get(rule.id);
    if (!existingRule) {
      throw new Error(`Alert rule not found: ${rule.id}`);
    }

    this.rules.set(rule.id, rule);

    // 重启规则评估
    this.stopRuleEvaluation(rule.id);
    if (this.isRunning && rule.enabled) {
      this.startRuleEvaluation(rule);
    }

    this.logger.info(`Updated alert rule: ${rule.name} (${rule.id})`);
    this.emit('rule-updated', rule);
  }

  /**
   * 评估指标并触发告警
   */
  async evaluateMetrics(metrics: Metrics): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      try {
        await this.evaluateRule(rule, metrics);
      } catch (error) {
        this.logger.error(
          `Failed to evaluate rule ${rule.id}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警规则
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 手动解决告警
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return;
    }

    alert.status = 'resolved';
    alert.resolvedTime = Date.now();

    this.logger.info(`Alert resolved: ${alert.ruleName} (${alertId})`);
    this.emit('alert-resolved', alert);

    // 从活跃告警中移除
    this.activeAlerts.delete(alertId);
  }

  /**
   * 启动规则评估
   */
  private startRuleEvaluation(rule: AlertRule): void {
    const timer = setInterval(async () => {
      try {
        // 这里需要获取当前指标，实际实现中应该从指标收集器获取
        // await this.evaluateRule(rule, currentMetrics);
      } catch (error) {
        this.logger.error(
          `Rule evaluation failed: ${rule.id}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, rule.evaluationInterval);

    this.evaluationTimers.set(rule.id, timer);
  }

  /**
   * 停止规则评估
   */
  private stopRuleEvaluation(ruleId: string): void {
    const timer = this.evaluationTimers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.evaluationTimers.delete(ruleId);
    }
  }

  /**
   * 评估单个规则
   */
  private async evaluateRule(rule: AlertRule, metrics: Metrics): Promise<void> {
    const condition = rule.condition;
    const metricValue = this.extractMetricValue(metrics, condition.metric);

    if (metricValue === undefined) {
      return;
    }

    const isTriggered = this.evaluateCondition(condition, metricValue);
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      (alert) => alert.ruleId === rule.id
    );

    if (isTriggered) {
      if (!existingAlert) {
        // 创建新告警
        await this.createAlert(rule, metricValue);
      } else {
        // 更新现有告警
        existingAlert.lastEvaluationTime = Date.now();
        existingAlert.metadata.currentValue = metricValue;
      }
    } else if (existingAlert) {
      // 解决告警
      this.resolveAlert(existingAlert.id);
    }
  }

  /**
   * 创建新告警
   */
  private async createAlert(
    rule: AlertRule,
    currentValue: number
  ): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;
    const alert: ActiveAlert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'firing',
      message: `${rule.description} (current: ${currentValue}, threshold: ${rule.condition.threshold})`,
      startTime: Date.now(),
      lastEvaluationTime: Date.now(),
      metadata: {
        currentValue,
        threshold: rule.condition.threshold,
        metric: rule.condition.metric
      }
    };

    this.activeAlerts.set(alertId, alert);

    this.logger.warn(`Alert triggered: ${rule.name} (${alertId})`);
    this.emit('alert-triggered', alert);

    // 发送通知
    await this.sendNotifications(rule, alert);
  }

  /**
   * 发送告警通知
   */
  private async sendNotifications(
    rule: AlertRule,
    alert: ActiveAlert
  ): Promise<void> {
    for (const notification of rule.notifications) {
      if (!notification.enabled) {
        continue;
      }

      try {
        await this.sendNotification(notification, alert);
      } catch (error) {
        this.logger.error(
          `Failed to send notification: ${notification.type}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * 发送单个通知
   */
  private async sendNotification(
    notification: AlertNotification,
    alert: ActiveAlert
  ): Promise<void> {
    // 这里应该根据通知类型实现具体的发送逻辑
    this.logger.info(
      `Sending ${notification.type} notification for alert ${alert.id}`
    );

    // 触发通知事件，让外部系统处理
    this.emit('notification', {
      type: notification.type,
      config: notification.config,
      alert
    });
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  /**
   * 从指标中提取值
   */
  private extractMetricValue(
    metrics: Metrics,
    metricPath: string
  ): number | undefined {
    const parts = metricPath.split('.');
    let current: any = metrics;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return typeof current === 'number' ? current : undefined;
  }
}
