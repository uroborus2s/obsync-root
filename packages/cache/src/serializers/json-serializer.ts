import { type } from '@stratix/utils';
import { CacheSerializer, JSONSerializerOptions } from '../types/serializer.js';

// 扩展type模块的函数集合
const typeUtils = {
  ...type,
  // 检查是否为Buffer类型
  isBuffer(obj: any): obj is Buffer {
    return Buffer.isBuffer(obj);
  }
};

/**
 * JSON序列化器
 * 使用JSON.stringify和JSON.parse进行序列化和反序列化
 */
export class JSONSerializer implements CacheSerializer {
  private readonly replacer?:
    | (string | number)[]
    | null
    | ((key: string, value: any) => any);
  private readonly reviver?: Parameters<typeof JSON.parse>[1];
  private readonly space?: string | number;

  /**
   * 创建JSON序列化器实例
   * @param options 序列化选项
   */
  constructor(options: JSONSerializerOptions = {}) {
    this.replacer = options.replacer;
    this.reviver = options.reviver;
    this.space = options.space;
  }

  /**
   * 序列化数据为JSON字符串
   * @param data 要序列化的数据
   * @returns 序列化后的JSON字符串
   */
  serialize<T>(data: T): string {
    try {
      // 处理undefined值，因为JSON.stringify会忽略undefined
      if (typeUtils.isUndefined(data)) {
        return JSON.stringify({ _type: 'undefined' });
      }

      // 处理函数值，因为JSON.stringify不能序列化函数
      if (typeUtils.isFunction(data)) {
        return JSON.stringify({
          _type: 'function',
          _value: data.toString()
        });
      }

      // 处理日期对象，确保正确反序列化
      if (data instanceof Date) {
        return JSON.stringify({
          _type: 'date',
          _value: data.toISOString()
        });
      }

      // 处理正则表达式
      if (data instanceof RegExp) {
        return JSON.stringify({
          _type: 'regexp',
          _source: data.source,
          _flags: data.flags
        });
      }

      // 处理Buffer对象
      if (typeUtils.isBuffer(data)) {
        return JSON.stringify({
          _type: 'buffer',
          _value: data.toString('base64')
        });
      }

      // 处理Set对象
      if (data instanceof Set) {
        return JSON.stringify(
          {
            _type: 'set',
            _value: Array.from(data)
          },
          this.replacer as any,
          this.space
        );
      }

      // 处理Map对象
      if (data instanceof Map) {
        return JSON.stringify(
          {
            _type: 'map',
            _value: Array.from(data.entries())
          },
          this.replacer as any,
          this.space
        );
      }

      // 普通数据序列化
      return JSON.stringify(data, this.replacer as any, this.space);
    } catch (error) {
      throw new Error(`JSON序列化失败: ${(error as Error).message}`);
    }
  }

  /**
   * 从JSON字符串反序列化数据
   * @param data JSON字符串
   * @returns 反序列化后的数据
   */
  deserialize<T>(data: string | Buffer): T {
    try {
      // 确保数据是字符串
      const jsonString =
        typeof data === 'string' ? data : data.toString('utf8');

      // 反序列化JSON
      const parsed = JSON.parse(jsonString, this.reviver);

      // 处理特殊类型标记
      if (parsed && typeof parsed === 'object' && '_type' in parsed) {
        switch (parsed._type) {
          case 'undefined':
            return undefined as unknown as T;

          case 'function':
            // 警告：出于安全考虑，不应该直接eval函数字符串
            // 这里只返回一个占位函数
            return function () {
              throw new Error('不能反序列化函数内容');
            } as unknown as T;

          case 'date':
            return new Date(parsed._value) as unknown as T;

          case 'regexp':
            return new RegExp(parsed._source, parsed._flags) as unknown as T;

          case 'buffer':
            return Buffer.from(parsed._value, 'base64') as unknown as T;

          case 'set':
            return new Set(parsed._value) as unknown as T;

          case 'map':
            return new Map(parsed._value) as unknown as T;
        }
      }

      return parsed;
    } catch (error) {
      throw new Error(`JSON反序列化失败: ${(error as Error).message}`);
    }
  }
}
