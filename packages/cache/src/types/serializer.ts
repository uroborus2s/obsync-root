/**
 * 缓存序列化器接口
 * 负责数据的序列化和反序列化
 */
export interface CacheSerializer {
  /**
   * 序列化数据
   * @param data 要序列化的数据
   * @returns 序列化后的字符串或Buffer
   */
  serialize<T>(data: T): string | Buffer | Promise<string | Buffer>;

  /**
   * 反序列化数据
   * @param data 序列化的数据
   * @returns 原始数据
   */
  deserialize<T>(data: string | Buffer): T | Promise<T>;
}

/**
 * JSON序列化器选项
 */
export interface JSONSerializerOptions {
  replacer?: (key: string, value: any) => any;
  reviver?: (key: string, value: any) => any;
  space?: string | number;
}

/**
 * MessagePack序列化器选项
 */
export interface MessagePackSerializerOptions {
  structuredClone?: boolean;
  useRecords?: boolean;
  moreTypes?: boolean;
}
