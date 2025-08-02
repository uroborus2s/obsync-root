/**
 * Redis命令封装
 */

// @ts-nocheck
import { Cluster, Redis } from 'ioredis';
import { createRedisError } from '../errors/index.js';

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
export class RedisStreamCommands {
  constructor(private redis: Redis | Cluster) {}

  /**
   * 添加消息到Redis Stream
   */
  async addMessage(
    stream: string,
    fields: Record<string, string>
  ): Promise<string> {
    const args: (string | number)[] = [stream, '*'];

    // 添加字段键值对
    for (const [key, value] of Object.entries(fields)) {
      args.push(key, value);
    }

    const result = await (this.redis as any).xadd(...args);
    return result || '';
  }

  /**
   * 读取消息（无消费者组）
   */
  async readMessages(
    streams: string[],
    ids: string[],
    options?: { count?: number; block?: number }
  ): Promise<
    Array<[string, { id: string; fields: Record<string, string> }[]]>
  > {
    const args: (string | number)[] = [];

    if (options?.count) {
      args.push('COUNT', options.count);
    }

    if (options?.block !== undefined) {
      args.push('BLOCK', options.block);
    }

    args.push('STREAMS', ...streams, ...ids);

    try {
      const result = await this.redis.xread(
        ...(args as Parameters<typeof this.redis.xread>)
      );

      if (!result || !Array.isArray(result)) {
        return [];
      }

      return (result as Array<[string, any[]]>).map(
        ([stream, messages]: [string, any[]]) => [
          stream,
          messages.map(([id, fields]: [string, string[]]) => ({
            id,
            fields: this.parseFields(fields)
          }))
        ]
      );
    } catch (error) {
      console.error('Failed to read messages:', error);
      return [];
    }
  }

  /**
   * 使用消费者组读取消息
   */
  async xreadgroup(
    streams: Record<string, string>,
    options: StreamReadGroupOptions
  ): Promise<Array<[string, StreamMessage[]]>> {
    try {
      const args: any[] = ['GROUP', options.group, options.consumer];

      if (options.count) {
        args.push('COUNT', options.count);
      }

      if (options.block !== undefined) {
        args.push('BLOCK', options.block);
      }

      if (options.noAck) {
        args.push('NOACK');
      }

      args.push('STREAMS');

      const streamNames = Object.keys(streams);
      const streamIds = Object.values(streams);

      args.push(...streamNames, ...streamIds);

      const result = await this.redis.xreadgroup(...args);

      if (!result) return [];

      return result.map(([stream, messages]: [string, any[]]) => [
        stream,
        messages.map(([id, fields]: [string, string[]]) => ({
          id,
          fields: this.parseFields(fields)
        }))
      ]);
    } catch (error) {
      throw createRedisError.command(
        `Failed to read from streams with group ${options.group}`,
        'XREADGROUP',
        undefined,
        error
      );
    }
  }

  /**
   * 确认消息
   */
  async xack(stream: string, group: string, ...ids: string[]): Promise<number> {
    try {
      return await this.redis.xack(stream, group, ...ids);
    } catch (error) {
      throw createRedisError.command(
        `Failed to acknowledge messages in stream ${stream}`,
        'XACK',
        undefined,
        error
      );
    }
  }

  /**
   * 获取流长度
   */
  async xlen(stream: string): Promise<number> {
    try {
      return await this.redis.xlen(stream);
    } catch (error) {
      throw createRedisError.command(
        `Failed to get length of stream ${stream}`,
        'XLEN',
        undefined,
        error
      );
    }
  }

  /**
   * 创建消费者组
   */
  async xgroupCreate(
    stream: string,
    group: string,
    id: string = '$',
    mkstream = false
  ): Promise<string> {
    try {
      const args = ['CREATE', stream, group, id];
      if (mkstream) {
        args.push('MKSTREAM');
      }
      return await this.redis.xgroup(...args);
    } catch (error) {
      // 如果组已存在，忽略错误
      if (error.message.includes('BUSYGROUP')) {
        return 'OK';
      }
      throw createRedisError.command(
        `Failed to create consumer group ${group} for stream ${stream}`,
        'XGROUP CREATE',
        undefined,
        error
      );
    }
  }

  /**
   * 删除消费者组
   */
  async xgroupDestroy(stream: string, group: string): Promise<number> {
    try {
      return await this.redis.xgroup('DESTROY', stream, group);
    } catch (error) {
      throw createRedisError.command(
        `Failed to destroy consumer group ${group} for stream ${stream}`,
        'XGROUP DESTROY',
        undefined,
        error
      );
    }
  }

  /**
   * 获取流信息
   */
  async xinfoStream(stream: string): Promise<StreamInfo> {
    try {
      const result = await this.redis.xinfo('STREAM', stream);
      return this.parseStreamInfo(result);
    } catch (error) {
      throw createRedisError.command(
        `Failed to get info for stream ${stream}`,
        'XINFO STREAM',
        undefined,
        error
      );
    }
  }

  /**
   * 获取消费者组信息
   */
  async xinfoGroups(stream: string): Promise<ConsumerGroupInfo[]> {
    try {
      const result = await this.redis.xinfo('GROUPS', stream);
      return result.map((group: any[]) => this.parseGroupInfo(group));
    } catch (error) {
      throw createRedisError.command(
        `Failed to get groups info for stream ${stream}`,
        'XINFO GROUPS',
        undefined,
        error
      );
    }
  }

  /**
   * 修剪流
   */
  async xtrim(
    stream: string,
    strategy: 'MAXLEN' | 'MINID',
    threshold: number | string,
    approximate = false
  ): Promise<number> {
    try {
      const args = [stream, strategy];
      if (approximate) {
        args.push('~');
      }
      args.push(String(threshold));

      return await this.redis.xtrim(...args);
    } catch (error) {
      throw createRedisError.command(
        `Failed to trim stream ${stream}`,
        'XTRIM',
        undefined,
        error
      );
    }
  }

  /**
   * 获取待处理消息
   */
  async xpending(
    stream: string,
    group: string,
    start = '-',
    end = '+',
    count = 10,
    consumer?: string
  ): Promise<any[]> {
    try {
      const args = [stream, group, start, end, count];
      if (consumer) {
        args.push(consumer);
      }

      return await this.redis.xpending(...args);
    } catch (error) {
      throw createRedisError.command(
        `Failed to get pending messages for stream ${stream}`,
        'XPENDING',
        undefined,
        error
      );
    }
  }

  /**
   * 声明消息所有权
   */
  async xclaim(
    stream: string,
    group: string,
    consumer: string,
    minIdleTime: number,
    ...ids: string[]
  ): Promise<StreamMessage[]> {
    try {
      const result = await this.redis.xclaim(
        stream,
        group,
        consumer,
        minIdleTime,
        ...ids
      );

      return result.map(([id, fields]: [string, string[]]) => ({
        id,
        fields: this.parseFields(fields)
      }));
    } catch (error) {
      throw createRedisError.command(
        `Failed to claim messages in stream ${stream}`,
        'XCLAIM',
        undefined,
        error
      );
    }
  }

  /**
   * 解析字段数组为对象
   */
  private parseFields(fields: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      result[fields[i]] = fields[i + 1];
    }
    return result;
  }

  /**
   * 解析流信息
   */
  private parseStreamInfo(info: any[]): StreamInfo {
    const result: any = {};
    for (let i = 0; i < info.length; i += 2) {
      const key = info[i];
      const value = info[i + 1];

      if (key === 'first-entry' || key === 'last-entry') {
        if (value && value.length >= 2) {
          result[key.replace('-', '')] = {
            id: value[0],
            fields: this.parseFields(value[1])
          };
        }
      } else {
        result[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] =
          value;
      }
    }
    return result;
  }

  /**
   * 解析消费者组信息
   */
  private parseGroupInfo(group: any[]): ConsumerGroupInfo {
    const result: any = {};
    for (let i = 0; i < group.length; i += 2) {
      const key = group[i];
      const value = group[i + 1];
      result[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] =
        value;
    }
    return result;
  }
}
