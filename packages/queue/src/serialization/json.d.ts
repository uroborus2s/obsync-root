/**
 * JSON序列化器
 */
export interface JsonSerializerOptions {
    space?: number;
    replacer?: (key: string, value: any) => any;
    reviver?: (key: string, value: any) => any;
}
export declare class JsonSerializer {
    private options;
    constructor(options?: JsonSerializerOptions);
    /**
     * 序列化对象为JSON字符串
     */
    serialize(data: any): string;
    /**
     * 反序列化JSON字符串为对象
     */
    deserialize<T = any>(data: string): T;
    /**
     * 序列化为Buffer
     */
    serializeToBuffer(data: any): Buffer;
    /**
     * 从Buffer反序列化
     */
    deserializeFromBuffer<T = any>(buffer: Buffer): T;
    /**
     * 检查数据是否可序列化
     */
    isSerializable(data: any): boolean;
    /**
     * 获取序列化后的大小（字节）
     */
    getSerializedSize(data: any): number;
    /**
     * 深度克隆对象
     */
    clone<T>(data: T): T;
}
export declare const defaultJsonSerializer: JsonSerializer;
export declare const compactJsonSerializer: JsonSerializer;
export declare const prettyJsonSerializer: JsonSerializer;
export declare const safeJsonSerializer: JsonSerializer;
export declare const dateAwareJsonSerializer: JsonSerializer;
export declare const createJsonSerializer: (options: JsonSerializerOptions) => JsonSerializer;
//# sourceMappingURL=json.d.ts.map