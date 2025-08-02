/**
 * JSON序列化器
 */
import { MessageDeserializationError, MessageSerializationError } from '../errors/index.js';
// 错误类型转换辅助函数
const toError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};
export class JsonSerializer {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    /**
     * 序列化对象为JSON字符串
     */
    serialize(data) {
        try {
            return JSON.stringify(data, this.options.replacer, this.options.space);
        }
        catch (error) {
            throw new MessageSerializationError(`Failed to serialize data to JSON: ${toError(error).message}`, { data, error });
        }
    }
    /**
     * 反序列化JSON字符串为对象
     */
    deserialize(data) {
        try {
            return JSON.parse(data, this.options.reviver);
        }
        catch (error) {
            throw new MessageDeserializationError(`Failed to deserialize JSON data: ${toError(error).message}`, { data, error });
        }
    }
    /**
     * 序列化为Buffer
     */
    serializeToBuffer(data) {
        const jsonString = this.serialize(data);
        return Buffer.from(jsonString, 'utf8');
    }
    /**
     * 从Buffer反序列化
     */
    deserializeFromBuffer(buffer) {
        const jsonString = buffer.toString('utf8');
        return this.deserialize(jsonString);
    }
    /**
     * 检查数据是否可序列化
     */
    isSerializable(data) {
        try {
            JSON.stringify(data);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 获取序列化后的大小（字节）
     */
    getSerializedSize(data) {
        const serialized = this.serialize(data);
        return Buffer.byteLength(serialized, 'utf8');
    }
    /**
     * 深度克隆对象
     */
    clone(data) {
        return this.deserialize(this.serialize(data));
    }
}
// 默认JSON序列化器实例
export const defaultJsonSerializer = new JsonSerializer();
// 紧凑JSON序列化器（无空格）
export const compactJsonSerializer = new JsonSerializer({ space: 0 });
// 美化JSON序列化器（带缩进）
export const prettyJsonSerializer = new JsonSerializer({ space: 2 });
// 安全JSON序列化器（处理循环引用）
export const safeJsonSerializer = new JsonSerializer({
    replacer: (function () {
        const seen = new WeakSet();
        return function (key, value) {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular Reference]';
                }
                seen.add(value);
            }
            return value;
        };
    })()
});
// 日期处理JSON序列化器
export const dateAwareJsonSerializer = new JsonSerializer({
    replacer: (key, value) => {
        if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
        }
        return value;
    },
    reviver: (key, value) => {
        if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
        }
        return value;
    }
});
// 创建自定义JSON序列化器
export const createJsonSerializer = (options) => {
    return new JsonSerializer(options);
};
//# sourceMappingURL=json.js.map