/**
 * 重试策略接口和基础实现
 */
import { Logger } from '../utils/index.js';
export interface RetryPolicy {
    /**
     * 计算下次重试的延迟时间（毫秒）
     * @param attempt 当前重试次数（从1开始）
     * @param error 导致重试的错误
     * @returns 延迟时间（毫秒），返回-1表示不再重试
     */
    calculateDelay(attempt: number, error?: Error): number;
    /**
     * 判断是否应该重试
     * @param attempt 当前重试次数
     * @param error 导致重试的错误
     * @returns 是否应该重试
     */
    shouldRetry(attempt: number, error?: Error): boolean;
    /**
     * 获取最大重试次数
     */
    getMaxAttempts(): number;
    /**
     * 重置策略状态
     */
    reset(): void;
}
export interface RetryPolicyConfig {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    jitter?: boolean;
    retryableErrors?: string[];
    nonRetryableErrors?: string[];
}
export declare abstract class BaseRetryPolicy implements RetryPolicy {
    protected logger: Logger;
    protected maxAttempts: number;
    protected baseDelay: number;
    protected maxDelay: number;
    protected jitter: boolean;
    protected retryableErrors: Set<string>;
    protected nonRetryableErrors: Set<string>;
    constructor(config?: RetryPolicyConfig);
    abstract calculateDelay(attempt: number, error?: Error): number;
    shouldRetry(attempt: number, error?: Error): boolean;
    getMaxAttempts(): number;
    reset(): void;
    /**
     * 添加抖动
     */
    protected addJitter(delay: number): number;
    /**
     * 限制最大延迟
     */
    protected limitDelay(delay: number): number;
}
export declare class FixedDelayRetryPolicy extends BaseRetryPolicy {
    calculateDelay(attempt: number, error?: Error): number;
}
export declare class LinearBackoffRetryPolicy extends BaseRetryPolicy {
    private multiplier;
    constructor(config?: RetryPolicyConfig & {
        multiplier?: number;
    });
    calculateDelay(attempt: number, error?: Error): number;
}
export declare class ExponentialBackoffRetryPolicy extends BaseRetryPolicy {
    private multiplier;
    private base;
    constructor(config?: RetryPolicyConfig & {
        multiplier?: number;
        base?: number;
    });
    calculateDelay(attempt: number, error?: Error): number;
}
export declare class CustomRetryPolicy extends BaseRetryPolicy {
    private delayFunction;
    constructor(delayFunction: (attempt: number, error?: Error) => number, config?: RetryPolicyConfig);
    calculateDelay(attempt: number, error?: Error): number;
}
export declare class DecoratedRetryPolicy extends BaseRetryPolicy {
    private strategies;
    private currentStrategyIndex;
    constructor(strategies: RetryPolicy[], config?: RetryPolicyConfig);
    calculateDelay(attempt: number, error?: Error): number;
    reset(): void;
}
export declare class CircuitBreakerRetryPolicy extends BaseRetryPolicy {
    private failureCount;
    private lastFailureTime;
    private circuitBreakerTimeout;
    private failureThreshold;
    private state;
    constructor(config?: RetryPolicyConfig & {
        circuitBreakerTimeout?: number;
        failureThreshold?: number;
    });
    shouldRetry(attempt: number, error?: Error): boolean;
    calculateDelay(attempt: number, error?: Error): number;
    private updateCircuitBreakerState;
    reset(): void;
    getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
export declare class RetryPolicyFactory {
    private static policies;
    /**
     * 注册重试策略
     */
    static register(name: string, factory: (config?: any) => RetryPolicy): void;
    /**
     * 创建重试策略
     */
    static create(name: string, config?: any): RetryPolicy;
    /**
     * 获取所有可用的策略名称
     */
    static getAvailablePolicies(): string[];
    /**
     * 检查策略是否存在
     */
    static has(name: string): boolean;
    /**
     * 创建组合重试策略
     */
    static createComposite(strategies: RetryPolicy[], config?: RetryPolicyConfig): RetryPolicy;
    /**
     * 创建自定义重试策略
     */
    static createCustom(delayFunction: (attempt: number, error?: Error) => number, config?: RetryPolicyConfig): RetryPolicy;
    /**
     * 创建预配置的生产环境策略
     */
    static createProductionPolicy(): RetryPolicy;
    /**
     * 创建预配置的开发环境策略
     */
    static createDevelopmentPolicy(): RetryPolicy;
}
export declare class RetryExecutor {
    private policy;
    private logger;
    constructor(policy: RetryPolicy);
    /**
     * 执行带重试的操作
     */
    execute<T>(operation: () => Promise<T>, context?: {
        operationName?: string;
        metadata?: any;
    }): Promise<T>;
    /**
     * 睡眠指定时间
     */
    private sleep;
    /**
     * 更新重试策略
     */
    setPolicy(policy: RetryPolicy): void;
    /**
     * 获取当前重试策略
     */
    getPolicy(): RetryPolicy;
}
export declare const createRetryPolicy: (type: "fixed" | "linear" | "exponential", config?: RetryPolicyConfig) => RetryPolicy;
export declare const withRetry: <T>(operation: () => Promise<T>, policy: RetryPolicy | string, config?: RetryPolicyConfig & {
    operationName?: string;
    metadata?: any;
}) => Promise<T>;
//# sourceMappingURL=policy.d.ts.map