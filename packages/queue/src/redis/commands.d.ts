/**
 * Redis命令封装
 */
import { Cluster, Redis } from 'ioredis';
export interface StreamAddOptions {
    maxLength?: number;
    approximateMaxLength?: boolean;
}
export interface StreamReadOptions {
    count?: number;
    block?: number;
}
export interface StreamReadGroupOptions extends StreamReadOptions {
    group: string;
    consumer: string;
    noAck?: boolean;
}
export interface StreamMessage {
    id: string;
    fields: Record<string, string>;
}
export interface StreamInfo {
    length: number;
    radixTreeKeys: number;
    radixTreeNodes: number;
    groups: number;
    lastGeneratedId: string;
    firstEntry?: StreamMessage;
    lastEntry?: StreamMessage;
}
export interface ConsumerGroupInfo {
    name: string;
    consumers: number;
    pending: number;
    lastDeliveredId: string;
}
/**
 * Redis Streams命令封装类
 */
export declare class RedisStreamCommands {
    private redis;
    constructor(redis: Redis | Cluster);
    /**
     * 添加消息到Redis Stream
     */
    addMessage(stream: string, fields: Record<string, string>): Promise<string>;
    /**
     * 读取消息（无消费者组）
     */
    readMessages(streams: string[], ids: string[], options?: {
        count?: number;
        block?: number;
    }): Promise<Array<[string, {
        id: string;
        fields: Record<string, string>;
    }[]]>>;
    /**
     * 使用消费者组读取消息
     */
    xreadgroup(streams: Record<string, string>, options: StreamReadGroupOptions): Promise<Array<[string, StreamMessage[]]>>;
    /**
     * 确认消息
     */
    xack(stream: string, group: string, ...ids: string[]): Promise<number>;
    /**
     * 获取流长度
     */
    xlen(stream: string): Promise<number>;
    /**
     * 创建消费者组
     */
    xgroupCreate(stream: string, group: string, id?: string, mkstream?: boolean): Promise<string>;
    /**
     * 删除消费者组
     */
    xgroupDestroy(stream: string, group: string): Promise<number>;
    /**
     * 获取流信息
     */
    xinfoStream(stream: string): Promise<StreamInfo>;
    /**
     * 获取消费者组信息
     */
    xinfoGroups(stream: string): Promise<ConsumerGroupInfo[]>;
    /**
     * 修剪流
     */
    xtrim(stream: string, strategy: 'MAXLEN' | 'MINID', threshold: number | string, approximate?: boolean): Promise<number>;
    /**
     * 获取待处理消息
     */
    xpending(stream: string, group: string, start?: string, end?: string, count?: number, consumer?: string): Promise<any[]>;
    /**
     * 声明消息所有权
     */
    xclaim(stream: string, group: string, consumer: string, minIdleTime: number, ...ids: string[]): Promise<StreamMessage[]>;
    /**
     * 解析字段数组为对象
     */
    private parseFields;
    /**
     * 解析流信息
     */
    private parseStreamInfo;
    /**
     * 解析消费者组信息
     */
    private parseGroupInfo;
}
//# sourceMappingURL=commands.d.ts.map