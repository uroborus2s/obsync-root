/**
 * 生产者 - 消息发送和路由
 */
import { EventEmitter } from 'events';
import { IProducer, IQueue, Message, ProducerMetrics, SendOptions, SendResult } from '../types/index.js';
export declare class Producer<T = any> extends EventEmitter implements IProducer<T> {
    readonly queue: IQueue<T>;
    readonly config: any;
    private logger;
    private isStarted;
    private metrics;
    private batchBuffer;
    private batchTimer?;
    private retryQueue;
    private retryTimer?;
    constructor(queue: IQueue<T>, config?: any);
    /**
     * 启动生产者
     */
    start(): Promise<void>;
    /**
     * 停止生产者
     */
    stop(): Promise<void>;
    /**
     * 检查生产者是否运行中
     */
    isRunning(): boolean;
    /**
     * 发送单条消息
     */
    send(message: Message<T>, options?: SendOptions): Promise<SendResult>;
    /**
     * 批量发送消息
     */
    sendBatch(messages: Message<T>[], options?: SendOptions): Promise<SendResult[]>;
    /**
     * 发送延迟消息
     */
    sendDelayed(message: Message<T>, delay: number, options?: SendOptions): Promise<SendResult>;
    /**
     * 发送优先级消息
     */
    sendPriority(message: Message<T>, priority: number, options?: SendOptions): Promise<SendResult>;
    /**
     * 获取生产者指标
     */
    getMetrics(): ProducerMetrics;
    /**
     * 重置指标
     */
    resetMetrics(): void;
    /**
     * 直接发送消息
     */
    private sendDirect;
    /**
     * 判断是否应该批处理
     */
    private shouldBatch;
    /**
     * 添加到批处理队列
     */
    private addToBatch;
    /**
     * 刷新批处理队列
     */
    private flushBatch;
    /**
     * 启动批处理定时器
     */
    private startBatchTimer;
    /**
     * 停止批处理定时器
     */
    private stopBatchTimer;
    /**
     * 判断是否应该重试
     */
    private shouldRetry;
    /**
     * 添加到重试队列
     */
    private addToRetryQueue;
    /**
     * 启动重试处理器
     */
    private startRetryProcessor;
    /**
     * 停止重试处理器
     */
    private stopRetryProcessor;
    /**
     * 处理重试队列
     */
    private processRetryQueue;
    /**
     * 刷新重试队列
     */
    private flushRetryQueue;
    /**
     * 更新指标
     */
    private updateMetrics;
    /**
     * 验证消息
     */
    private validateMessage;
}
//# sourceMappingURL=producer.d.ts.map