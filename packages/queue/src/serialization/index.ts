/**
 * 序列化模块统一导出
 */

import { defaultJsonSerializer } from './json.js';

// 具体导出避免循环依赖
export {
  compactJsonSerializer,
  defaultJsonSerializer,
  JsonSerializer,
  prettyJsonSerializer,
  safeJsonSerializer
} from './json.js';

// 序列化器接口
export interface ISerializer {
  serialize(data: any): string | Buffer;
  deserialize<T = any>(data: string | Buffer): T;
  serializeToBuffer(data: any): Buffer;
  deserializeFromBuffer<T = any>(buffer: Buffer): T;
  isSerializable(data: any): boolean;
  getSerializedSize(data: any): number;
}

// 序列化器类型
export type SerializerType = 'json' | 'msgpack' | 'protobuf';

// 序列化器工厂
export class SerializerFactory {
  private static serializers: Map<SerializerType, ISerializer> = new Map();

  /**
   * 注册序列化器
   */
  static register(type: SerializerType, serializer: ISerializer): void {
    this.serializers.set(type, serializer);
  }

  /**
   * 获取序列化器
   */
  static get(type: SerializerType): ISerializer {
    const serializer = this.serializers.get(type);
    if (!serializer) {
      throw new Error(`Serializer '${type}' not found`);
    }
    return serializer;
  }

  /**
   * 检查序列化器是否存在
   */
  static has(type: SerializerType): boolean {
    return this.serializers.has(type);
  }

  /**
   * 获取所有可用的序列化器类型
   */
  static getAvailableTypes(): SerializerType[] {
    return Array.from(this.serializers.keys());
  }
}

// 通用序列化器适配器
export class SerializerAdapter implements ISerializer {
  constructor(private serializer: ISerializer) {}

  serialize(data: any): string | Buffer {
    return this.serializer.serialize(data);
  }

  deserialize<T = any>(data: string | Buffer): T {
    return this.serializer.deserialize<T>(data);
  }

  serializeToBuffer(data: any): Buffer {
    return this.serializer.serializeToBuffer(data);
  }

  deserializeFromBuffer<T = any>(buffer: Buffer): T {
    return this.serializer.deserializeFromBuffer<T>(buffer);
  }

  isSerializable(data: any): boolean {
    return this.serializer.isSerializable(data);
  }

  getSerializedSize(data: any): number {
    return this.serializer.getSerializedSize(data);
  }
}

// 压缩序列化器装饰器
export class CompressedSerializer implements ISerializer {
  constructor(
    private serializer: ISerializer,
    private compressionThreshold: number = 1024
  ) {}

  serialize(data: any): string | Buffer {
    const serialized = this.serializer.serialize(data);

    if (typeof serialized === 'string') {
      const buffer = Buffer.from(serialized, 'utf8');
      return this.shouldCompress(buffer) ? this.compress(buffer) : serialized;
    }

    return this.shouldCompress(serialized)
      ? this.compress(serialized)
      : serialized;
  }

  deserialize<T = any>(data: string | Buffer): T {
    if (Buffer.isBuffer(data) && this.isCompressed(data)) {
      const decompressed = this.decompress(data);
      return this.serializer.deserializeFromBuffer<T>(decompressed);
    }

    return this.serializer.deserialize<T>(data);
  }

  serializeToBuffer(data: any): Buffer {
    const buffer = this.serializer.serializeToBuffer(data);
    return this.shouldCompress(buffer) ? this.compress(buffer) : buffer;
  }

  deserializeFromBuffer<T = any>(buffer: Buffer): T {
    if (this.isCompressed(buffer)) {
      const decompressed = this.decompress(buffer);
      return this.serializer.deserializeFromBuffer<T>(decompressed);
    }

    return this.serializer.deserializeFromBuffer<T>(buffer);
  }

  isSerializable(data: any): boolean {
    return this.serializer.isSerializable(data);
  }

  getSerializedSize(data: any): number {
    const buffer = this.serializeToBuffer(data);
    return buffer.length;
  }

  private shouldCompress(buffer: Buffer): boolean {
    return buffer.length > this.compressionThreshold;
  }

  private isCompressed(buffer: Buffer): boolean {
    // 简单的压缩标识检查（实际实现中应该使用更可靠的方法）
    return buffer.length > 4 && buffer.readUInt32BE(0) === 0x1f8b0800;
  }

  private compress(buffer: Buffer): Buffer {
    // 简化的压缩实现（实际应该使用 zlib 或其他压缩库）
    // 这里只是添加一个标识头
    const header = Buffer.alloc(4);
    header.writeUInt32BE(0x1f8b0800, 0);
    return Buffer.concat([header, buffer]);
  }

  private decompress(buffer: Buffer): Buffer {
    // 简化的解压缩实现
    return buffer.slice(4);
  }
}

// 缓存序列化器装饰器
export class CachedSerializer implements ISerializer {
  private cache: Map<string, any> = new Map();
  private maxCacheSize: number;

  constructor(
    private serializer: ISerializer,
    maxCacheSize: number = 1000
  ) {
    this.maxCacheSize = maxCacheSize;
  }

  serialize(data: any): string | Buffer {
    const key = this.getCacheKey(data);

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = this.serializer.serialize(data);
    this.setCache(key, result);

    return result;
  }

  deserialize<T = any>(data: string | Buffer): T {
    const key = this.getCacheKey(data);

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = this.serializer.deserialize<T>(data);
    this.setCache(key, result);

    return result;
  }

  serializeToBuffer(data: any): Buffer {
    const result = this.serialize(data);
    return Buffer.isBuffer(result) ? result : Buffer.from(result, 'utf8');
  }

  deserializeFromBuffer<T = any>(buffer: Buffer): T {
    return this.deserialize<T>(buffer);
  }

  isSerializable(data: any): boolean {
    return this.serializer.isSerializable(data);
  }

  getSerializedSize(data: any): number {
    return this.serializer.getSerializedSize(data);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    // 简化的缓存统计
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // 实际实现中应该跟踪命中率
    };
  }

  private getCacheKey(data: any): string {
    // 简化的缓存键生成
    if (typeof data === 'string') {
      return `str:${data.slice(0, 100)}`;
    }
    if (Buffer.isBuffer(data)) {
      return `buf:${data.slice(0, 100).toString('hex')}`;
    }
    return `obj:${JSON.stringify(data).slice(0, 100)}`;
  }

  private setCache(key: string, value: any): void {
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
export const getSerializer = (type: SerializerType): ISerializer => {
  return SerializerFactory.get(type);
};

export const createCompressedSerializer = (
  type: SerializerType,
  threshold?: number
): ISerializer => {
  const baseSerializer = SerializerFactory.get(type);
  return new CompressedSerializer(baseSerializer, threshold);
};

export const createCachedSerializer = (
  type: SerializerType,
  maxCacheSize?: number
): ISerializer => {
  const baseSerializer = SerializerFactory.get(type);
  return new CachedSerializer(baseSerializer, maxCacheSize);
};
