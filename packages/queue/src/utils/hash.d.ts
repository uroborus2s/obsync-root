/**
 * 哈希工具函数
 */
/**
 * 计算CRC16哈希值
 * @param data 输入数据
 * @returns CRC16哈希值
 */
export declare const crc16: (data: string | Buffer) => number;
/**
 * 计算Redis集群哈希槽
 * @param key Redis键名
 * @returns 哈希槽编号 (0-16383)
 */
export declare const getRedisSlot: (key: string) => number;
/**
 * 简单哈希函数 (djb2算法)
 * @param str 输入字符串
 * @returns 哈希值
 */
export declare const djb2Hash: (str: string) => number;
/**
 * FNV-1a哈希函数
 * @param str 输入字符串
 * @returns 哈希值
 */
export declare const fnv1aHash: (str: string) => number;
/**
 * 一致性哈希节点
 */
export interface ConsistentHashNode {
    id: string;
    weight: number;
    virtualNodes?: number;
}
/**
 * 一致性哈希环
 */
export declare class ConsistentHash {
    private ring;
    private nodes;
    private virtualNodeCount;
    constructor(virtualNodeCount?: number);
    /**
     * 添加节点
     * @param node 节点信息
     */
    addNode(node: ConsistentHashNode): void;
    /**
     * 移除节点
     * @param nodeId 节点ID
     */
    removeNode(nodeId: string): void;
    /**
     * 获取键对应的节点
     * @param key 键名
     * @returns 节点ID
     */
    getNode(key: string): string | null;
    /**
     * 获取所有节点
     * @returns 节点列表
     */
    getNodes(): string[];
    /**
     * 获取节点数量
     * @returns 节点数量
     */
    getNodeCount(): number;
    private sortRing;
}
/**
 * 加权轮询算法
 */
export declare class WeightedRoundRobin {
    private nodes;
    private totalWeight;
    /**
     * 添加节点
     * @param id 节点ID
     * @param weight 权重
     */
    addNode(id: string, weight: number): void;
    /**
     * 移除节点
     * @param id 节点ID
     */
    removeNode(id: string): void;
    /**
     * 获取下一个节点
     * @returns 节点ID
     */
    getNext(): string | null;
    /**
     * 重置权重
     */
    reset(): void;
}
/**
 * 生成消息ID
 * @param prefix 前缀
 * @returns 消息ID
 */
export declare const generateMessageId: (prefix?: string) => string;
/**
 * 生成UUID v4
 * @returns UUID字符串
 */
export declare const generateUUID: () => string;
/**
 * 计算字符串的MD5哈希（简化版）
 * @param str 输入字符串
 * @returns 哈希值
 */
export declare const simpleHash: (str: string) => string;
//# sourceMappingURL=hash.d.ts.map