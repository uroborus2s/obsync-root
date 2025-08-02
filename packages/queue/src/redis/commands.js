/**
 * Redis命令封装
 */
import { createRedisError } from '../errors/index.js';
/**
 * Redis Streams命令封装类
 */
export class RedisStreamCommands {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    /**
     * 添加消息到Redis Stream
     */
    async addMessage(stream, fields) {
        const args = [stream, '*'];
        // 添加字段键值对
        for (const [key, value] of Object.entries(fields)) {
            args.push(key, value);
        }
        const result = await this.redis.xadd(...args);
        return result || '';
    }
    /**
     * 读取消息（无消费者组）
     */
    async readMessages(streams, ids, options) {
        const args = [];
        if (options?.count) {
            args.push('COUNT', options.count);
        }
        if (options?.block !== undefined) {
            args.push('BLOCK', options.block);
        }
        args.push('STREAMS', ...streams, ...ids);
        try {
            const result = await this.redis.xread(...args);
            if (!result || !Array.isArray(result)) {
                return [];
            }
            return result.map(([stream, messages]) => [
                stream,
                messages.map(([id, fields]) => ({
                    id,
                    fields: this.parseFields(fields)
                }))
            ]);
        }
        catch (error) {
            console.error('Failed to read messages:', error);
            return [];
        }
    }
    /**
     * 使用消费者组读取消息
     */
    async xreadgroup(streams, options) {
        try {
            const args = ['GROUP', options.group, options.consumer];
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
            if (!result)
                return [];
            return result.map(([stream, messages]) => [
                stream,
                messages.map(([id, fields]) => ({
                    id,
                    fields: this.parseFields(fields)
                }))
            ]);
        }
        catch (error) {
            throw createRedisError.command(`Failed to read from streams with group ${options.group}`, 'XREADGROUP', undefined, error);
        }
    }
    /**
     * 确认消息
     */
    async xack(stream, group, ...ids) {
        try {
            return await this.redis.xack(stream, group, ...ids);
        }
        catch (error) {
            throw createRedisError.command(`Failed to acknowledge messages in stream ${stream}`, 'XACK', undefined, error);
        }
    }
    /**
     * 获取流长度
     */
    async xlen(stream) {
        try {
            return await this.redis.xlen(stream);
        }
        catch (error) {
            throw createRedisError.command(`Failed to get length of stream ${stream}`, 'XLEN', undefined, error);
        }
    }
    /**
     * 创建消费者组
     */
    async xgroupCreate(stream, group, id = '$', mkstream = false) {
        try {
            const args = ['CREATE', stream, group, id];
            if (mkstream) {
                args.push('MKSTREAM');
            }
            return await this.redis.xgroup(...args);
        }
        catch (error) {
            // 如果组已存在，忽略错误
            if (error.message.includes('BUSYGROUP')) {
                return 'OK';
            }
            throw createRedisError.command(`Failed to create consumer group ${group} for stream ${stream}`, 'XGROUP CREATE', undefined, error);
        }
    }
    /**
     * 删除消费者组
     */
    async xgroupDestroy(stream, group) {
        try {
            return await this.redis.xgroup('DESTROY', stream, group);
        }
        catch (error) {
            throw createRedisError.command(`Failed to destroy consumer group ${group} for stream ${stream}`, 'XGROUP DESTROY', undefined, error);
        }
    }
    /**
     * 获取流信息
     */
    async xinfoStream(stream) {
        try {
            const result = await this.redis.xinfo('STREAM', stream);
            return this.parseStreamInfo(result);
        }
        catch (error) {
            throw createRedisError.command(`Failed to get info for stream ${stream}`, 'XINFO STREAM', undefined, error);
        }
    }
    /**
     * 获取消费者组信息
     */
    async xinfoGroups(stream) {
        try {
            const result = await this.redis.xinfo('GROUPS', stream);
            return result.map((group) => this.parseGroupInfo(group));
        }
        catch (error) {
            throw createRedisError.command(`Failed to get groups info for stream ${stream}`, 'XINFO GROUPS', undefined, error);
        }
    }
    /**
     * 修剪流
     */
    async xtrim(stream, strategy, threshold, approximate = false) {
        try {
            const args = [stream, strategy];
            if (approximate) {
                args.push('~');
            }
            args.push(String(threshold));
            return await this.redis.xtrim(...args);
        }
        catch (error) {
            throw createRedisError.command(`Failed to trim stream ${stream}`, 'XTRIM', undefined, error);
        }
    }
    /**
     * 获取待处理消息
     */
    async xpending(stream, group, start = '-', end = '+', count = 10, consumer) {
        try {
            const args = [stream, group, start, end, count];
            if (consumer) {
                args.push(consumer);
            }
            return await this.redis.xpending(...args);
        }
        catch (error) {
            throw createRedisError.command(`Failed to get pending messages for stream ${stream}`, 'XPENDING', undefined, error);
        }
    }
    /**
     * 声明消息所有权
     */
    async xclaim(stream, group, consumer, minIdleTime, ...ids) {
        try {
            const result = await this.redis.xclaim(stream, group, consumer, minIdleTime, ...ids);
            return result.map(([id, fields]) => ({
                id,
                fields: this.parseFields(fields)
            }));
        }
        catch (error) {
            throw createRedisError.command(`Failed to claim messages in stream ${stream}`, 'XCLAIM', undefined, error);
        }
    }
    /**
     * 解析字段数组为对象
     */
    parseFields(fields) {
        const result = {};
        for (let i = 0; i < fields.length; i += 2) {
            result[fields[i]] = fields[i + 1];
        }
        return result;
    }
    /**
     * 解析流信息
     */
    parseStreamInfo(info) {
        const result = {};
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
            }
            else {
                result[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] =
                    value;
            }
        }
        return result;
    }
    /**
     * 解析消费者组信息
     */
    parseGroupInfo(group) {
        const result = {};
        for (let i = 0; i < group.length; i += 2) {
            const key = group[i];
            const value = group[i + 1];
            result[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] =
                value;
        }
        return result;
    }
}
//# sourceMappingURL=commands.js.map