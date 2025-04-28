import { crypto } from '@stratix/utils';

/**
 * 缓存键生成器
 * 用于创建规范化的缓存键
 */
export class KeyBuilder {
  private readonly prefix: string;
  private readonly namespacePrefix: string | undefined;

  /**
   * 创建键生成器实例
   * @param prefix 全局前缀
   * @param namespace 命名空间
   */
  constructor(prefix: string = '', namespace?: string) {
    this.prefix = prefix;
    this.namespacePrefix = namespace;
  }

  /**
   * 获取当前键生成器的命名空间
   * @returns 命名空间或undefined
   */
  getNamespace(): string | undefined {
    return this.namespacePrefix;
  }

  /**
   * 创建新的命名空间键生成器
   * @param namespace 命名空间
   * @returns 新的键生成器实例
   */
  namespace(namespace: string): KeyBuilder {
    return new KeyBuilder(this.prefix, namespace);
  }

  /**
   * 生成缓存键
   * 自动添加前缀和命名空间
   * @param key 原始键
   * @returns 规范化的键
   */
  build(key: string): string {
    // 处理空键
    if (!key) {
      throw new Error('缓存键不能为空');
    }

    // 构建完整键
    let fullKey = key;

    // 添加命名空间
    if (this.namespacePrefix) {
      fullKey = `${this.namespacePrefix}:${fullKey}`;
    }

    // 添加全局前缀
    if (this.prefix) {
      fullKey = `${this.prefix}:${fullKey}`;
    }

    return fullKey;
  }

  /**
   * 生成锁键
   * @param key 原始键
   * @returns 锁键
   */
  buildLockKey(key: string): string {
    return this.build(`lock:${key}`);
  }

  /**
   * 生成标签键
   * @param tag 标签名
   * @returns 标签键
   */
  buildTagKey(tag: string): string {
    return this.build(`tag:${tag}`);
  }

  /**
   * 从参数生成缓存键
   * @param baseKey 基础键
   * @param args 参数
   * @returns 带参数的缓存键
   */
  buildWithArgs(baseKey: string, args: any[]): string {
    if (args.length === 0) {
      return this.build(baseKey);
    }

    // 为参数创建哈希
    const argsHash = this.hashArgs(args);
    return this.build(`${baseKey}:${argsHash}`);
  }

  /**
   * 对参数数组进行散列处理
   * @param args 参数数组
   * @returns 参数的哈希值
   */
  private hashArgs(args: any[]): string {
    if (args.length === 0) {
      return '';
    }

    try {
      // 序列化参数并创建哈希
      const serialized = JSON.stringify(args);
      return crypto.sha1(serialized).substring(0, 8);
    } catch (error) {
      // 如果无法序列化，返回参数数量
      return `args(${args.length})`;
    }
  }
}
