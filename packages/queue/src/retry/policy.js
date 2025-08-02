/**
 * 重试策略接口和基础实现
 */
import { createLogger, LogLevel } from '../utils/index.js';
// 抽象重试策略基类
export class BaseRetryPolicy {
    logger;
    maxAttempts;
    baseDelay;
    maxDelay;
    jitter;
    retryableErrors;
    nonRetryableErrors;
    constructor(config = {}) {
        this.logger = createLogger({ level: LogLevel.INFO, format: 'json' });
        this.logger.setContext({ component: 'RetryPolicy' });
        this.maxAttempts = config.maxAttempts || 3;
        this.baseDelay = config.baseDelay || 1000;
        this.maxDelay = config.maxDelay || 30000;
        this.jitter = config.jitter !== false;
        this.retryableErrors = new Set(config.retryableErrors || []);
        this.nonRetryableErrors = new Set(config.nonRetryableErrors || []);
    }
    shouldRetry(attempt, error) {
        // 检查重试次数
        if (attempt > this.maxAttempts) {
            return false;
        }
        // 检查错误类型
        if (error) {
            const errorType = error.constructor.name;
            const errorCode = error.code;
            // 如果在非重试错误列表中，不重试
            if (this.nonRetryableErrors.has(errorType) ||
                (errorCode && this.nonRetryableErrors.has(errorCode))) {
                return false;
            }
            // 如果指定了可重试错误列表，只重试列表中的错误
            if (this.retryableErrors.size > 0) {
                return (this.retryableErrors.has(errorType) ||
                    (errorCode && this.retryableErrors.has(errorCode)));
            }
        }
        return true;
    }
    getMaxAttempts() {
        return this.maxAttempts;
    }
    reset() {
        // 基类默认不需要重置状态
    }
    /**
     * 添加抖动
     */
    addJitter(delay) {
        if (!this.jitter) {
            return delay;
        }
        // 添加±25%的随机抖动
        const jitterRange = delay * 0.25;
        const jitterAmount = (Math.random() - 0.5) * 2 * jitterRange;
        return Math.max(0, delay + jitterAmount);
    }
    /**
     * 限制最大延迟
     */
    limitDelay(delay) {
        return Math.min(delay, this.maxDelay);
    }
}
// 固定延迟重试策略
export class FixedDelayRetryPolicy extends BaseRetryPolicy {
    calculateDelay(attempt, error) {
        if (!this.shouldRetry(attempt, error)) {
            return -1;
        }
        const delay = this.baseDelay;
        return this.addJitter(this.limitDelay(delay));
    }
}
// 线性退避重试策略
export class LinearBackoffRetryPolicy extends BaseRetryPolicy {
    multiplier;
    constructor(config = {}) {
        super(config);
        this.multiplier = config.multiplier || 1;
    }
    calculateDelay(attempt, error) {
        if (!this.shouldRetry(attempt, error)) {
            return -1;
        }
        const delay = this.baseDelay * attempt * this.multiplier;
        return this.addJitter(this.limitDelay(delay));
    }
}
// 指数退避重试策略
export class ExponentialBackoffRetryPolicy extends BaseRetryPolicy {
    multiplier;
    base;
    constructor(config = {}) {
        super(config);
        this.multiplier = config.multiplier || 1;
        this.base = config.base || 2;
    }
    calculateDelay(attempt, error) {
        if (!this.shouldRetry(attempt, error)) {
            return -1;
        }
        const delay = this.baseDelay * this.multiplier * Math.pow(this.base, attempt - 1);
        return this.addJitter(this.limitDelay(delay));
    }
}
// 自定义重试策略
export class CustomRetryPolicy extends BaseRetryPolicy {
    delayFunction;
    constructor(delayFunction, config = {}) {
        super(config);
        this.delayFunction = delayFunction;
    }
    calculateDelay(attempt, error) {
        if (!this.shouldRetry(attempt, error)) {
            return -1;
        }
        const delay = this.delayFunction(attempt, error);
        return this.addJitter(this.limitDelay(delay));
    }
}
// 装饰器退避策略（结合多种策略）
export class DecoratedRetryPolicy extends BaseRetryPolicy {
    strategies;
    currentStrategyIndex = 0;
    constructor(strategies, config = {}) {
        super(config);
        this.strategies = strategies;
    }
    calculateDelay(attempt, error) {
        if (!this.shouldRetry(attempt, error)) {
            return -1;
        }
        // 根据重试次数选择不同的策略
        const strategyIndex = Math.min(this.currentStrategyIndex, this.strategies.length - 1);
        const strategy = this.strategies[strategyIndex];
        const delay = strategy.calculateDelay(attempt, error);
        // 如果当前策略返回-1，尝试下一个策略
        if (delay === -1 && strategyIndex < this.strategies.length - 1) {
            this.currentStrategyIndex++;
            return this.calculateDelay(attempt, error);
        }
        return delay;
    }
    reset() {
        super.reset();
        this.currentStrategyIndex = 0;
        this.strategies.forEach((strategy) => strategy.reset());
    }
}
// 断路器重试策略
export class CircuitBreakerRetryPolicy extends BaseRetryPolicy {
    failureCount = 0;
    lastFailureTime = 0;
    circuitBreakerTimeout;
    failureThreshold;
    state = 'CLOSED';
    constructor(config = {}) {
        super(config);
        this.circuitBreakerTimeout = config.circuitBreakerTimeout || 60000; // 1分钟
        this.failureThreshold = config.failureThreshold || 5;
    }
    shouldRetry(attempt, error) {
        const now = Date.now();
        // 更新断路器状态
        this.updateCircuitBreakerState(now, error);
        // 如果断路器打开，不允许重试
        if (this.state === 'OPEN') {
            this.logger.warn('Circuit breaker is OPEN, blocking retry attempts');
            return false;
        }
        return super.shouldRetry(attempt, error);
    }
    calculateDelay(attempt, error) {
        if (!this.shouldRetry(attempt, error)) {
            return -1;
        }
        // 在半开状态下，使用较长的延迟
        const baseDelay = this.state === 'HALF_OPEN' ? this.baseDelay * 2 : this.baseDelay;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        return this.addJitter(this.limitDelay(delay));
    }
    updateCircuitBreakerState(now, error) {
        switch (this.state) {
            case 'CLOSED':
                if (error) {
                    this.failureCount++;
                    this.lastFailureTime = now;
                    if (this.failureCount >= this.failureThreshold) {
                        this.state = 'OPEN';
                        this.logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
                    }
                }
                else {
                    this.failureCount = 0;
                }
                break;
            case 'OPEN':
                if (now - this.lastFailureTime >= this.circuitBreakerTimeout) {
                    this.state = 'HALF_OPEN';
                    this.logger.info('Circuit breaker moved to HALF_OPEN state');
                }
                break;
            case 'HALF_OPEN':
                if (error) {
                    this.state = 'OPEN';
                    this.lastFailureTime = now;
                    this.logger.warn('Circuit breaker reopened due to failure in HALF_OPEN state');
                }
                else {
                    this.state = 'CLOSED';
                    this.failureCount = 0;
                    this.logger.info('Circuit breaker closed after successful operation');
                }
                break;
        }
    }
    reset() {
        super.reset();
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.state = 'CLOSED';
    }
    getState() {
        return this.state;
    }
}
// 重试策略工厂
export class RetryPolicyFactory {
    static policies = new Map();
    static {
        // 注册内置策略
        this.register('fixed', (config) => new FixedDelayRetryPolicy(config));
        this.register('linear', (config) => new LinearBackoffRetryPolicy(config));
        this.register('exponential', (config) => new ExponentialBackoffRetryPolicy(config));
        this.register('circuit-breaker', (config) => new CircuitBreakerRetryPolicy(config));
    }
    /**
     * 注册重试策略
     */
    static register(name, factory) {
        this.policies.set(name, factory);
    }
    /**
     * 创建重试策略
     */
    static create(name, config) {
        const factory = this.policies.get(name);
        if (!factory) {
            throw new Error(`Unknown retry policy: ${name}`);
        }
        return factory(config);
    }
    /**
     * 获取所有可用的策略名称
     */
    static getAvailablePolicies() {
        return Array.from(this.policies.keys());
    }
    /**
     * 检查策略是否存在
     */
    static has(name) {
        return this.policies.has(name);
    }
    /**
     * 创建组合重试策略
     */
    static createComposite(strategies, config) {
        return new DecoratedRetryPolicy(strategies, config);
    }
    /**
     * 创建自定义重试策略
     */
    static createCustom(delayFunction, config) {
        return new CustomRetryPolicy(delayFunction, config);
    }
    /**
     * 创建预配置的生产环境策略
     */
    static createProductionPolicy() {
        return new ExponentialBackoffRetryPolicy({
            maxAttempts: 5,
            baseDelay: 1000,
            maxDelay: 30000,
            jitter: true,
            nonRetryableErrors: [
                'ValidationError',
                'AuthenticationError',
                'AuthorizationError'
            ]
        });
    }
    /**
     * 创建预配置的开发环境策略
     */
    static createDevelopmentPolicy() {
        return new FixedDelayRetryPolicy({
            maxAttempts: 3,
            baseDelay: 500,
            maxDelay: 5000,
            jitter: false
        });
    }
}
// 重试执行器
export class RetryExecutor {
    policy;
    logger;
    constructor(policy) {
        this.policy = policy;
        this.logger = createLogger({ level: LogLevel.INFO, format: 'json' });
        this.logger.setContext({ component: 'RetryExecutor' });
    }
    /**
     * 执行带重试的操作
     */
    async execute(operation, context) {
        let attempt = 0;
        let lastError;
        this.policy.reset();
        while (true) {
            attempt++;
            try {
                const result = await operation();
                if (attempt > 1) {
                    this.logger.info(`Operation succeeded after ${attempt} attempts`, {
                        operationName: context?.operationName,
                        attempts: attempt,
                        metadata: context?.metadata
                    });
                }
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const delay = this.policy.calculateDelay(attempt, lastError);
                if (delay === -1) {
                    this.logger.error(`Operation failed after ${attempt} attempts`, lastError, {
                        operationName: context?.operationName,
                        attempts: attempt,
                        metadata: context?.metadata
                    });
                    throw lastError;
                }
                this.logger.warn(`Operation failed, retrying in ${delay}ms`, {
                    operationName: context?.operationName,
                    attempt,
                    error: lastError.message,
                    delay,
                    metadata: context?.metadata
                });
                await this.sleep(delay);
            }
        }
    }
    /**
     * 睡眠指定时间
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * 更新重试策略
     */
    setPolicy(policy) {
        this.policy = policy;
    }
    /**
     * 获取当前重试策略
     */
    getPolicy() {
        return this.policy;
    }
}
// 便捷函数
export const createRetryPolicy = (type, config) => {
    return RetryPolicyFactory.create(type, config);
};
export const withRetry = async (operation, policy, config) => {
    const retryPolicy = typeof policy === 'string'
        ? RetryPolicyFactory.create(policy, config)
        : policy;
    const executor = new RetryExecutor(retryPolicy);
    return executor.execute(operation, {
        operationName: config?.operationName,
        metadata: config?.metadata
    });
};
//# sourceMappingURL=policy.js.map