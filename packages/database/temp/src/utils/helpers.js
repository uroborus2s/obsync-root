// @stratix/database 函数式编程工具
// 基于 @stratix/utils 的数据库专用函数式工具
import { curry, pipe, tryCatch } from '@stratix/utils/functional';
import { deepMerge } from '@stratix/utils/data';
// 便捷函数
export const success = (data) => ({
    success: true,
    data
});
export const failure = (error) => ({
    success: false,
    error
});
// 映射结果函数
export const mapResult = (result, mapper) => {
    if (result.success) {
        return success(mapper(result.data));
    }
    return result;
};
// 便捷函数
export const successResult = (data) => success(data);
export const failureResult = (error) => failure(error);
// Option 工具函数
export const some = (value) => ({ some: true, value });
export const none = () => ({ some: false });
// 从可空值创建 Option
export const fromNullable = (value) => {
    return value != null ? some(value) : none();
};
// 重新导出其他工具
export { curry, deepMerge, pipe, tryCatch };
export function memoize(fn, options = {}) {
    const cache = new Map();
    const ttl = options.ttl || 60000; // 默认1分钟
    return (...args) => {
        const key = JSON.stringify(args);
        const now = Date.now();
        const cached = cache.get(key);
        if (cached && (!options.ttl || now - cached.timestamp < ttl)) {
            return cached.value;
        }
        const result = fn(...args);
        cache.set(key, { value: result, timestamp: now });
        return result;
    };
}
