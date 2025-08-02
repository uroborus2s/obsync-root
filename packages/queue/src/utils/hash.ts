/**
 * 哈希工具函数
 */

// CRC16查找表
const CRC16_TABLE = new Uint16Array([
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 0x8108,
  0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
  0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6, 0x9339, 0x8318, 0xb37b,
  0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
  0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee,
  0xf5cf, 0xc5ac, 0xd58d, 0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
  0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d,
  0xc7bc, 0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
  0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b, 0x5af5,
  0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
  0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a, 0x6ca6, 0x7c87, 0x4ce4,
  0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
  0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13,
  0x2e32, 0x1e51, 0x0e70, 0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
  0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e,
  0xe16f, 0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
  0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e, 0x02b1,
  0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
  0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d, 0x34e2, 0x24c3, 0x14a0,
  0x0481, 0x7466, 0x6447, 0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
  0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657,
  0x7676, 0x4615, 0x5634, 0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
  0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882,
  0x28a3, 0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
  0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92, 0xfd2e,
  0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
  0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1, 0xef1f, 0xff3e, 0xcf5d,
  0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
  0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
]);

/**
 * 计算CRC16哈希值
 * @param data 输入数据
 * @returns CRC16哈希值
 */
export const crc16 = (data: string | Buffer): number => {
  let crc = 0;
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

  for (let i = 0; i < buffer.length; i++) {
    crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ buffer[i]) & 0xff]) & 0xffff;
  }

  return crc;
};

/**
 * 计算Redis集群哈希槽
 * @param key Redis键名
 * @returns 哈希槽编号 (0-16383)
 */
export const getRedisSlot = (key: string): number => {
  // 查找哈希标签 {...}
  const start = key.indexOf('{');
  const end = key.indexOf('}', start + 1);

  let hashKey = key;
  if (start !== -1 && end !== -1 && end > start + 1) {
    hashKey = key.substring(start + 1, end);
  }

  return crc16(hashKey) % 16384;
};

/**
 * 简单哈希函数 (djb2算法)
 * @param str 输入字符串
 * @returns 哈希值
 */
export const djb2Hash = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash >>> 0; // 转换为无符号32位整数
};

/**
 * FNV-1a哈希函数
 * @param str 输入字符串
 * @returns 哈希值
 */
export const fnv1aHash = (str: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash *= 16777619;
  }
  return hash >>> 0;
};

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
export class ConsistentHash {
  private ring: Map<number, string> = new Map();
  private nodes: Map<string, ConsistentHashNode> = new Map();
  private virtualNodeCount: number;

  constructor(virtualNodeCount = 160) {
    this.virtualNodeCount = virtualNodeCount;
  }

  /**
   * 添加节点
   * @param node 节点信息
   */
  addNode(node: ConsistentHashNode): void {
    this.nodes.set(node.id, node);

    const virtualNodes = node.virtualNodes || this.virtualNodeCount;
    for (let i = 0; i < virtualNodes; i++) {
      const virtualNodeId = `${node.id}:${i}`;
      const hash = djb2Hash(virtualNodeId);
      this.ring.set(hash, node.id);
    }

    // 重新排序环
    this.sortRing();
  }

  /**
   * 移除节点
   * @param nodeId 节点ID
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.nodes.delete(nodeId);

    // 移除虚拟节点
    const virtualNodes = node.virtualNodes || this.virtualNodeCount;
    for (let i = 0; i < virtualNodes; i++) {
      const virtualNodeId = `${nodeId}:${i}`;
      const hash = djb2Hash(virtualNodeId);
      this.ring.delete(hash);
    }
  }

  /**
   * 获取键对应的节点
   * @param key 键名
   * @returns 节点ID
   */
  getNode(key: string): string | null {
    if (this.ring.size === 0) return null;

    const hash = djb2Hash(key);
    const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    // 找到第一个大于等于hash的节点
    for (const ringHash of sortedHashes) {
      if (ringHash >= hash) {
        return this.ring.get(ringHash) || null;
      }
    }

    // 如果没找到，返回第一个节点（环形结构）
    return this.ring.get(sortedHashes[0]) || null;
  }

  /**
   * 获取所有节点
   * @returns 节点列表
   */
  getNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * 获取节点数量
   * @returns 节点数量
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  private sortRing(): void {
    const sorted = new Map(
      [...this.ring.entries()].sort((a, b) => a[0] - b[0])
    );
    this.ring = sorted;
  }
}

/**
 * 加权轮询算法
 */
export class WeightedRoundRobin {
  private nodes: Array<{ id: string; weight: number; currentWeight: number }> =
    [];
  private totalWeight = 0;

  /**
   * 添加节点
   * @param id 节点ID
   * @param weight 权重
   */
  addNode(id: string, weight: number): void {
    this.nodes.push({ id, weight, currentWeight: 0 });
    this.totalWeight += weight;
  }

  /**
   * 移除节点
   * @param id 节点ID
   */
  removeNode(id: string): void {
    const index = this.nodes.findIndex((node) => node.id === id);
    if (index !== -1) {
      this.totalWeight -= this.nodes[index].weight;
      this.nodes.splice(index, 1);
    }
  }

  /**
   * 获取下一个节点
   * @returns 节点ID
   */
  getNext(): string | null {
    if (this.nodes.length === 0) return null;

    let maxWeightNode = this.nodes[0];

    // 增加当前权重
    for (const node of this.nodes) {
      node.currentWeight += node.weight;
      if (node.currentWeight > maxWeightNode.currentWeight) {
        maxWeightNode = node;
      }
    }

    // 减少选中节点的当前权重
    maxWeightNode.currentWeight -= this.totalWeight;

    return maxWeightNode.id;
  }

  /**
   * 重置权重
   */
  reset(): void {
    for (const node of this.nodes) {
      node.currentWeight = 0;
    }
  }
}

/**
 * 生成消息ID
 * @param prefix 前缀
 * @returns 消息ID
 */
export const generateMessageId = (prefix = 'msg'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * 生成UUID v4
 * @returns UUID字符串
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 计算字符串的MD5哈希（简化版）
 * @param str 输入字符串
 * @returns 哈希值
 */
export const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }

  return Math.abs(hash).toString(16);
};
