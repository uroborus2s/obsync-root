/**
 * 告警系统
 * 提供基于规则的监控告警功能
 */
import { EventEmitter } from 'events';
import type { Metrics } from '../types/index.js';
/**
 * 告警规则类型
 */
export type AlertRuleType = 'threshold' | 'rate' | 'anomaly' | 'composite';
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
    condition: AlertCondition;
    evaluationInterval: number;
    forDuration: number;
    notifications: AlertNotification[];
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
    timeWindow?: number;
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
    condition: string;
    duration: number;
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
export declare class AlertManager extends EventEmitter {
    private rules;
    private activeAlerts;
    private evaluationTimers;
    private logger;
    private isRunning;
    constructor();
    /**
     * 启动告警管理器
     */
    start(): void;
    /**
     * 停止告警管理器
     */
    stop(): void;
    /**
     * 添加告警规则
     */
    addRule(rule: AlertRule): void;
    /**
     * 移除告警规则
     */
    removeRule(ruleId: string): void;
    /**
     * 更新告警规则
     */
    updateRule(rule: AlertRule): void;
    /**
     * 评估指标并触发告警
     */
    evaluateMetrics(metrics: Metrics): Promise<void>;
    /**
     * 获取活跃告警
     */
    getActiveAlerts(): ActiveAlert[];
    /**
     * 获取告警规则
     */
    getRules(): AlertRule[];
    /**
     * 手动解决告警
     */
    resolveAlert(alertId: string): void;
    /**
     * 启动规则评估
     */
    private startRuleEvaluation;
    /**
     * 停止规则评估
     */
    private stopRuleEvaluation;
    /**
     * 评估单个规则
     */
    private evaluateRule;
    /**
     * 创建新告警
     */
    private createAlert;
    /**
     * 发送告警通知
     */
    private sendNotifications;
    /**
     * 发送单个通知
     */
    private sendNotification;
    /**
     * 评估条件
     */
    private evaluateCondition;
    /**
     * 从指标中提取值
     */
    private extractMetricValue;
}
//# sourceMappingURL=alerts.d.ts.map