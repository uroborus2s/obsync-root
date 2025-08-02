/**
 * ID生成工具函数
 */
/**
 * 生成消息ID
 * @param prefix ID前缀
 * @returns 生成的消息ID
 */
export declare const generateMessageId: (prefix?: string) => string;
/**
 * 生成UUID
 * @returns UUID字符串
 */
export declare const generateUUID: () => string;
/**
 * 生成Redis Stream消息ID格式
 * @returns Redis Stream ID格式的字符串
 */
export declare const generateStreamId: () => string;
/**
 * 生成短ID（用于临时标识）
 * @param length ID长度
 * @returns 短ID字符串
 */
export declare const generateShortId: (length?: number) => string;
//# sourceMappingURL=id.d.ts.map