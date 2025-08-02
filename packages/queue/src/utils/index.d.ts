/**
 * 工具函数统一导出
 */
export { LogLevel, Logger, createLogger, createOperationLogger, createQueueLogger, defaultLogger } from './logger.js';
export { Validator, validateBatch, validateConsumerOptions, validateMessage, validateProducerConfig, validateQueueConfig, validateQueueName, validateRedisNode } from './validator.js';
export { ConsistentHash, WeightedRoundRobin, crc16, djb2Hash, fnv1aHash, generateMessageId, generateUUID, getRedisSlot, simpleHash } from './hash.js';
export { generateMessageId as generateMessageIdFromId, generateShortId, generateStreamId, generateUUID as generateUUIDFromId } from './id.js';
export declare const sleep: (ms: number) => Promise<void>;
export declare const toError: (error: unknown) => Error;
export declare const hasErrorMessage: (error: unknown, message: string) => boolean;
export declare const timeout: <T>(promise: Promise<T>, ms: number) => Promise<T>;
export declare const retry: <T>(fn: () => Promise<T>, maxAttempts: number, delay?: number, backoff?: number) => Promise<T>;
export declare const debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => T;
export declare const throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => T;
export declare const deepClone: <T>(obj: T) => T;
export declare const isPlainObject: (obj: any) => obj is Record<string, any>;
export declare const merge: <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]) => T;
export declare const pick: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
export declare const omit: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
export declare const formatBytes: (bytes: number, decimals?: number) => string;
export declare const formatDuration: (ms: number) => string;
export declare const parseConnectionString: (connectionString: string) => {
    host: string;
    port: number;
};
export declare const safeJsonParse: <T = any>(str: string, defaultValue: T) => T;
export declare const safeJsonStringify: (obj: any, defaultValue?: string) => string;
//# sourceMappingURL=index.d.ts.map