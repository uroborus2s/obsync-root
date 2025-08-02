/**
 * 工具函数统一导出
 */
// 具体导出避免循环依赖
// 便捷函数重新导出
export { LogLevel, Logger, createLogger, createOperationLogger, createQueueLogger, defaultLogger } from './logger.js';
export { Validator, validateBatch, validateConsumerOptions, validateMessage, validateProducerConfig, validateQueueConfig, validateQueueName, validateRedisNode } from './validator.js';
export { ConsistentHash, WeightedRoundRobin, crc16, djb2Hash, fnv1aHash, generateMessageId, generateUUID, getRedisSlot, simpleHash } from './hash.js';
// ID生成工具
export { generateMessageId as generateMessageIdFromId, generateShortId, generateStreamId, generateUUID as generateUUIDFromId } from './id.js';
// 通用工具函数
export const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
// 错误类型转换辅助函数
export const toError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};
// 检查错误消息是否包含特定文本
export const hasErrorMessage = (error, message) => {
    const err = toError(error);
    return err.message.includes(message);
};
export const timeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms))
    ]);
};
export const retry = async (fn, maxAttempts, delay = 1000, backoff = 1.5) => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxAttempts) {
                throw lastError;
            }
            await sleep(delay * Math.pow(backoff, attempt - 1));
        }
    }
    throw lastError;
};
export const debounce = (func, wait) => {
    let timeout = null;
    return ((...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    });
};
export const throttle = (func, limit) => {
    let inThrottle;
    return ((...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    });
};
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        return obj.map((item) => deepClone(item));
    }
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
};
export const isPlainObject = (obj) => {
    return (obj !== null &&
        typeof obj === 'object' &&
        !Array.isArray(obj) &&
        !(obj instanceof Date) &&
        !(obj instanceof RegExp));
};
export const merge = (target, ...sources) => {
    if (!sources.length)
        return target;
    const source = sources.shift();
    if (isPlainObject(target) && isPlainObject(source)) {
        for (const key in source) {
            if (isPlainObject(source[key])) {
                if (!target[key])
                    Object.assign(target, { [key]: {} });
                merge(target[key], source[key]);
            }
            else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return merge(target, ...sources);
};
export const pick = (obj, keys) => {
    const result = {};
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
};
export const omit = (obj, keys) => {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
};
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
export const formatDuration = (ms) => {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
};
export const parseConnectionString = (connectionString) => {
    const match = connectionString.match(/^([^:]+):(\d+)$/);
    if (!match) {
        throw new Error(`Invalid connection string format: ${connectionString}`);
    }
    return {
        host: match[1],
        port: parseInt(match[2], 10)
    };
};
export const safeJsonParse = (str, defaultValue) => {
    try {
        return JSON.parse(str);
    }
    catch {
        return defaultValue;
    }
};
export const safeJsonStringify = (obj, defaultValue = '{}') => {
    try {
        return JSON.stringify(obj);
    }
    catch {
        return defaultValue;
    }
};
//# sourceMappingURL=index.js.map