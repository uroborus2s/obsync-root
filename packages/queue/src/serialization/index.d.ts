/**
 * 序列化模块统一导出
 */
export { compactJsonSerializer, defaultJsonSerializer, JsonSerializer, prettyJsonSerializer, safeJsonSerializer } from './json.js';
export interface ISerializer {
    serialize(data: any): string | Buffer;
    deserialize<T = any>(data: string | Buffer): T;
    serializeToBuffer(data: any): Buffer;
    deserializeFromBuffer<T = any>(buffer: Buffer): T;
    isSerializable(data: any): boolean;
    getSerializedSize(data: any): number;
}
export type SerializerType = 'json' | 'msgpack' | 'protobuf';
export declare class SerializerFactory {
    private static serializers;
    /**
     * 注册序列化器
     */
    static register(type: SerializerType, serializer: ISerializer): void;
    /**
     * 获取序列化器
     */
    static get(type: SerializerType): ISerializer;
    /**
     * 检查序列化器是否存在
     */
    static has(type: SerializerType): boolean;
    /**
     * 获取所有可用的序列化器类型
     */
    static getAvailableTypes(): SerializerType[];
}
export declare class SerializerAdapter implements ISerializer {
    private serializer;
    constructor(serializer: ISerializer);
    serialize(data: any): string | Buffer;
    deserialize<T = any>(data: string | Buffer): T;
    serializeToBuffer(data: any): Buffer;
    deserializeFromBuffer<T = any>(buffer: Buffer): T;
    isSerializable(data: any): boolean;
    getSerializedSize(data: any): number;
}
export declare class CompressedSerializer implements ISerializer {
    private serializer;
    private compressionThreshold;
    constructor(serializer: ISerializer, compressionThreshold?: number);
    serialize(data: any): string | Buffer;
    deserialize<T = any>(data: string | Buffer): T;
    serializeToBuffer(data: any): Buffer;
    deserializeFromBuffer<T = any>(buffer: Buffer): T;
    isSerializable(data: any): boolean;
    getSerializedSize(data: any): number;
    private shouldCompress;
    private isCompressed;
    private compress;
    private decompress;
}
export declare class CachedSerializer implements ISerializer {
    private serializer;
    private cache;
    private maxCacheSize;
    constructor(serializer: ISerializer, maxCacheSize?: number);
    serialize(data: any): string | Buffer;
    deserialize<T = any>(data: string | Buffer): T;
    serializeToBuffer(data: any): Buffer;
    deserializeFromBuffer<T = any>(buffer: Buffer): T;
    isSerializable(data: any): boolean;
    getSerializedSize(data: any): number;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    private getCacheKey;
    private setCache;
}
export declare const getSerializer: (type: SerializerType) => ISerializer;
export declare const createCompressedSerializer: (type: SerializerType, threshold?: number) => ISerializer;
export declare const createCachedSerializer: (type: SerializerType, maxCacheSize?: number) => ISerializer;
//# sourceMappingURL=index.d.ts.map