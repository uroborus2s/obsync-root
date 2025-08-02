/**
 * 队列核心类 - 基于Redis Streams的消息队列实现
 */
import { EventEmitter } from 'events';
import { RedisConnectionManager } from '../redis/connection.js';
import { IQueue, Message, MessageQueryOptions, MessageQueryResult, QueueConfig, QueueInfo, QueueStats, SendOptions, SendResult } from '../types/index.js';
export declare class Queue<T = any> extends EventEmitter implements IQueue<T> {
    readonly name: string;
    readonly config: QueueConfig;
    private connectionManager;
    private logger;
    private _isRunning;
    private streamKey;
    private consumerGroupKey;
    private deadLetterKey?;
    private priorityKeys;
    constructor(name: string, config: QueueConfig, connectionManager: RedisConnectionManager);
    /**
     * 启动队列
     */
    start(): Promise<void>;
    /**
     * 停止队列
     */
    stop(): Promise<void>;
    /**
     * 检查队列是否运行中
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
     * 清空队列
     */
    purge(): Promise<number>;
    /**
     * 获取队列长度
     */
    getLength(): Promise<number>;
    /**
     * 获取队列信息
     */
    getInfo(): Promise<QueueInfo>;
    /**
     * 获取队列统计信息
     */
    getStats(): Promise<QueueStats>;
    /**
     * 查询消息
     */
    queryMessages(options?: MessageQueryOptions): Promise<MessageQueryResult<T>>;
    /**
     * 初始化Redis Streams
     */
    private initializeStreams;
    /**
     * 发送延迟消息
     */
    private sendDelayedMessage;
    /**
     * 验证消息
     */
    private validateMessage;
}
//# sourceMappingURL=queue.d.ts.map