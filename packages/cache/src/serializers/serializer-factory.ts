import { CacheSerializer, CacheSerializerType } from '../types/index.js';
import { JSONSerializer } from './json-serializer.js';
import { MessagePackSerializer } from './msgpack-serializer.js';

/**
 * 创建序列化器的工厂函数
 * @param type 序列化器类型
 * @param options 序列化器选项
 * @returns 序列化器实例
 */
export function createSerializer(
  type: CacheSerializerType = 'json',
  options: any = {}
): CacheSerializer {
  switch (type) {
    case 'json':
      return new JSONSerializer(options);
    case 'msgpack':
      return new MessagePackSerializer(options);
    default:
      throw new Error(`不支持的序列化器类型: ${type}`);
  }
}
