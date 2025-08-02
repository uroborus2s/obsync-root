/**
 * 序列化模块统一导出
 */
import { defaultJsonSerializer } from './json.js';
// 具体导出避免循环依赖
export { compactJsonSerializer, defaultJsonSerializer, JsonSerializer, prettyJsonSerializer, safeJsonSerializer } from './json.js';
// 序列化器工厂
export class SerializerFactory {
    static serializers = new Map();
    /**
     * 注册序列化器
     */
    static register(type, serializer) {
        this.serializers.set(type, serializer);
    }
    /**
     * 获取序列化器
     */
    static get(type) {
        const serializer = this.serializers.get(type);
        if (!serializer) {
            throw new Error(`Serializer '${type}' not found`);
        }
        return serializer;
    }
    /**
     * 检查序列化器是否存在
     */
    static has(type) {
        return this.serializers.has(type);
    }
    /**
     * 获取所有可用的序列化器类型
     */
    static getAvailableTypes() {
        return Array.from(this.serializers.keys());
    }
}
// 通用序列化器适配器
export class SerializerAdapter {
    serializer;
    constructor(serializer) {
        this.serializer = serializer;
    }
    serialize(data) {
        return this.serializer.serialize(data);
    }
    deserialize(data) {
        return this.serializer.deserialize(data);
    }
    serializeToBuffer(data) {
        return this.serializer.serializeToBuffer(data);
    }
    deserializeFromBuffer(buffer) {
        return this.serializer.deserializeFromBuffer(buffer);
    }
    isSerializable(data) {
        return this.serializer.isSerializable(data);
    }
    getSerializedSize(data) {
        return this.serializer.getSerializedSize(data);
    }
}
// 压缩序列化器装饰器
export class CompressedSerializer {
    serializer;
    compressionThreshold;
    constructor(serializer, compressionThreshold = 1024) {
        this.serializer = serializer;
        this.compressionThreshold = compressionThreshold;
    }
    serialize(data) {
        const serialized = this.serializer.serialize(data);
        if (typeof serialized === 'string') {
            const buffer = Buffer.from(serialized, 'utf8');
            return this.shouldCompress(buffer) ? this.compress(buffer) : serialized;
        }
        return this.shouldCompress(serialized)
            ? this.compress(serialized)
            : serialized;
    }
    deserialize(data) {
        if (Buffer.isBuffer(data) && this.isCompressed(data)) {
            const decompressed = this.decompress(data);
            return this.serializer.deserializeFromBuffer(decompressed);
        }
        return this.serializer.deserialize(data);
    }
    serializeToBuffer(data) {
        const buffer = this.serializer.serializeToBuffer(data);
        return this.shouldCompress(buffer) ? this.compress(buffer) : buffer;
    }
    deserializeFromBuffer(buffer) {
        if (this.isCompressed(buffer)) {
            const decompressed = this.decompress(buffer);
            return this.serializer.deserializeFromBuffer(decompressed);
        }
        return this.serializer.deserializeFromBuffer(buffer);
    }
    isSerializable(data) {
        return this.serializer.isSerializable(data);
    }
    getSerializedSize(data) {
        const buffer = this.serializeToBuffer(data);
        return buffer.length;
    }
    shouldCompress(buffer) {
        return buffer.length > this.compressionThreshold;
    }
    isCompressed(buffer) {
        // 简单的压缩标识检查（实际实现中应该使用更可靠的方法）
        return buffer.length > 4 && buffer.readUInt32BE(0) === 0x1f8b0800;
    }
    compress(buffer) {
        // 简化的压缩实现（实际应该使用 zlib 或其他压缩库）
        // 这里只是添加一个标识头
        const header = Buffer.alloc(4);
        header.writeUInt32BE(0x1f8b0800, 0);
        return Buffer.concat([header, buffer]);
    }
    decompress(buffer) {
        // 简化的解压缩实现
        return buffer.slice(4);
    }
}
// 缓存序列化器装饰器
export class CachedSerializer {
    serializer;
    cache = new Map();
    maxCacheSize;
    constructor(serializer, maxCacheSize = 1000) {
        this.serializer = serializer;
        this.maxCacheSize = maxCacheSize;
    }
    serialize(data) {
        const key = this.getCacheKey(data);
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const result = this.serializer.serialize(data);
        this.setCache(key, result);
        return result;
    }
    deserialize(data) {
        const key = this.getCacheKey(data);
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const result = this.serializer.deserialize(data);
        this.setCache(key, result);
        return result;
    }
    serializeToBuffer(data) {
        const result = this.serialize(data);
        return Buffer.isBuffer(result) ? result : Buffer.from(result, 'utf8');
    }
    deserializeFromBuffer(buffer) {
        return this.deserialize(buffer);
    }
    isSerializable(data) {
        return this.serializer.isSerializable(data);
    }
    getSerializedSize(data) {
        return this.serializer.getSerializedSize(data);
    }
    clearCache() {
        this.cache.clear();
    }
    getCacheStats() {
        // 简化的缓存统计
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: 0 // 实际实现中应该跟踪命中率
        };
    }
    getCacheKey(data) {
        // 简化的缓存键生成
        if (typeof data === 'string') {
            return `str:${data.slice(0, 100)}`;
        }
        if (Buffer.isBuffer(data)) {
            return `buf:${data.slice(0, 100).toString('hex')}`;
        }
        return `obj:${JSON.stringify(data).slice(0, 100)}`;
    }
    setCache(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            // 简单的LRU实现：删除第一个元素
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }
}
SerializerFactory.register('json', defaultJsonSerializer);
// 便捷函数
export const getSerializer = (type) => {
    return SerializerFactory.get(type);
};
export const createCompressedSerializer = (type, threshold) => {
    const baseSerializer = SerializerFactory.get(type);
    return new CompressedSerializer(baseSerializer, threshold);
};
export const createCachedSerializer = (type, maxCacheSize) => {
    const baseSerializer = SerializerFactory.get(type);
    return new CachedSerializer(baseSerializer, maxCacheSize);
};
//# sourceMappingURL=index.js.map