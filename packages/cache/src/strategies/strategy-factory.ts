import { CacheStrategy, CacheStrategyType } from '../types/index.js';
import { FIFOStrategy } from './fifo-strategy.js';
import { LFUStrategy } from './lfu-strategy.js';
import { LRUStrategy } from './lru-strategy.js';

/**
 * 创建缓存策略的工厂函数
 * @param type 策略类型
 * @param options 策略选项
 * @returns 策略实例
 */
export function createStrategy<K = string, V = any>(
  type: CacheStrategyType = 'lru',
  options: any = {}
): CacheStrategy<K, V> {
  switch (type) {
    case 'lru':
      return new LRUStrategy<K, V>(options);
    case 'fifo':
      return new FIFOStrategy<K, V>(options);
    case 'lfu':
      return new LFUStrategy<K, V>(options);
    default:
      throw new Error(`不支持的缓存策略类型: ${type}`);
  }
}
