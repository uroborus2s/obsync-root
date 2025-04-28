/**
 * 增强版JSON序列化模块
 * 提供对特殊JavaScript类型的序列化和反序列化支持
 *
 * 适用场景：
 * - 包含复杂数据类型的对象序列化（Map、Set、Buffer等）
 * - 包含循环引用的对象
 * - 包含函数的对象
 * - 包含Error对象的序列化
 * - 需要精确还原JavaScript对象结构的场景
 * - 需要安全合并复杂对象的场景
 *
 * 与基础JSON模块的区别：
 * - 基础模块 (serialize/parse): 更简单的API，更高的性能，适合常见数据
 * - 增强模块 (enhancedSerialize/enhancedDeserialize): 更强大的功能，支持更多类型，适合复杂数据
 *
 * 注意事项:
 * - 增强版序列化结果包含特殊类型标记，只能用enhancedDeserialize解析
 * - 对于简单对象，基础模块性能更好
 */

// 导入现有的深度克隆和合并函数
import { deepClone, deepMerge } from '../object/merge.js';

/**
 * 序列化选项接口
 */
export interface EnhancedSerializeOptions {
  /**
   * 是否处理函数
   * @default true
   */
  handleFunctions?: boolean;

  /**
   * 是否处理循环引用
   * @default true
   */
  handleCircular?: boolean;

  /**
   * 是否处理错误对象
   * @default true
   */
  handleErrors?: boolean;

  /**
   * 是否处理特殊对象类型（Date, RegExp, Map, Set, Buffer等）
   * @default true
   */
  handleSpecialObjects?: boolean;

  /**
   * 缩进空格数
   * @default undefined (无缩进)
   */
  indent?: number;

  /**
   * 自定义替换函数
   */
  replacer?: (key: string, value: any) => any;
}

/**
 * 反序列化选项接口
 */
export interface EnhancedDeserializeOptions {
  /**
   * 是否恢复函数
   * @default true
   */
  reviveFunctions?: boolean;

  /**
   * 是否恢复特殊对象类型（Date, RegExp, Map, Set, Buffer等）
   * @default true
   */
  reviveSpecialObjects?: boolean;

  /**
   * 自定义转换函数
   */
  reviver?: (key: string, value: any) => any;

  /**
   * 是否使用安全模式(不执行函数构造)
   * @default true
   */
  safeMode?: boolean;
}

/**
 * 增强序列化结果接口
 * 重命名以避免与serialize.ts中的SerializeResult冲突
 */
export interface EnhancedSerializeResult {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 序列化后的数据
   */
  data?: string;

  /**
   * 错误信息
   */
  error?: string;
}

// 特殊类型标记
const TYPE_MARKERS = {
  DATE: '__DATE__',
  REGEXP: '__REGEXP__',
  ERROR: '__ERROR__',
  FUNCTION: '__FUNCTION__',
  MAP: '__MAP__',
  SET: '__SET__',
  BUFFER: '__BUFFER__',
  BIGINT: '__BIGINT__',
  UNDEFINED: '__UNDEFINED__',
  INFINITY: '__INFINITY__',
  NAN: '__NAN__',
  CIRCULAR: '__CIRCULAR__'
};

/**
 * 增强版JSON序列化
 * 支持处理循环引用和JavaScript特殊类型
 *
 * @param data 要序列化的数据
 * @param options 序列化选项
 * @returns 序列化结果
 */
export function enhancedSerialize(
  data: any,
  options: EnhancedSerializeOptions = {}
): EnhancedSerializeResult {
  try {
    const {
      handleFunctions = true,
      handleCircular = true,
      handleErrors = true,
      handleSpecialObjects = true,
      indent,
      replacer
    } = options;

    // 用于检测循环引用
    const seen = new WeakMap();

    // 自定义替换函数
    const customReplacer = (key: string, value: any): any => {
      // 应用用户自定义replacer
      if (replacer) {
        value = replacer(key, value);
      }

      // 处理undefined
      if (value === undefined) {
        return { __type: TYPE_MARKERS.UNDEFINED };
      }

      // 处理特殊数字
      if (typeof value === 'number') {
        if (Number.isNaN(value)) {
          return { __type: TYPE_MARKERS.NAN };
        }
        if (!Number.isFinite(value)) {
          return {
            __type: TYPE_MARKERS.INFINITY,
            value: value > 0 ? 1 : -1
          };
        }
      }

      // 处理BigInt
      if (typeof value === 'bigint') {
        return {
          __type: TYPE_MARKERS.BIGINT,
          value: value.toString()
        };
      }

      // 处理对象类型
      if (value !== null && typeof value === 'object') {
        // 处理循环引用
        if (handleCircular && seen.has(value)) {
          return {
            __type: TYPE_MARKERS.CIRCULAR,
            value: seen.get(value)
          };
        }

        if (handleCircular) {
          seen.set(value, `${key || 'root'}`);
        }

        // 处理特殊对象类型
        if (handleSpecialObjects) {
          // Date对象
          if (value instanceof Date) {
            return {
              __type: TYPE_MARKERS.DATE,
              value: value.toISOString()
            };
          }

          // RegExp对象
          if (value instanceof RegExp) {
            return {
              __type: TYPE_MARKERS.REGEXP,
              source: value.source,
              flags: value.flags
            };
          }

          // Map对象
          if (value instanceof Map) {
            return {
              __type: TYPE_MARKERS.MAP,
              entries: Array.from(value.entries())
            };
          }

          // Set对象
          if (value instanceof Set) {
            return {
              __type: TYPE_MARKERS.SET,
              values: Array.from(value.values())
            };
          }

          // Buffer对象
          if (Buffer.isBuffer(value)) {
            return {
              __type: TYPE_MARKERS.BUFFER,
              data: value.toString('base64')
            };
          }
        }

        // 处理Error对象
        if (handleErrors && value instanceof Error) {
          return {
            __type: TYPE_MARKERS.ERROR,
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
      }

      // 处理函数
      if (handleFunctions && typeof value === 'function') {
        return {
          __type: TYPE_MARKERS.FUNCTION,
          source: value.toString()
        };
      }

      return value;
    };

    // 使用JSON.stringify序列化
    const serialized = JSON.stringify(data, customReplacer, indent);

    return {
      success: true,
      data: serialized
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 循环引用上下文接口
 */
interface CircularReferenceContext {
  path: string;
  parent: Record<string, any>;
}

/**
 * 增强版JSON反序列化
 * 支持恢复JavaScript特殊类型
 *
 * @param data 序列化的字符串数据
 * @param options 反序列化选项
 * @returns 反序列化的数据或错误
 */
export function enhancedDeserialize<T = any>(
  data: string,
  options: EnhancedDeserializeOptions = {}
): { success: boolean; data?: T; error?: string } {
  try {
    if (typeof data !== 'string') {
      return {
        success: false,
        error: '输入必须是字符串'
      };
    }

    const {
      reviveFunctions = true,
      reviveSpecialObjects = true,
      reviver,
      safeMode = true
    } = options;

    // 循环引用解析时的对象引用表
    const refMap = new Map<string, CircularReferenceContext>();
    let rootObject: any = null;

    // 自定义reviver函数
    const customReviver = (key: string, value: any): any => {
      // 应用用户自定义reviver
      if (reviver) {
        value = reviver(key, value);
      }

      // 针对特殊类型标记的对象进行处理
      if (value !== null && typeof value === 'object' && value.__type) {
        // 恢复undefined
        if (value.__type === TYPE_MARKERS.UNDEFINED) {
          return undefined;
        }

        // 恢复特殊数字
        if (value.__type === TYPE_MARKERS.NAN) {
          return NaN;
        }

        if (value.__type === TYPE_MARKERS.INFINITY) {
          return value.value > 0 ? Infinity : -Infinity;
        }

        // 恢复BigInt
        if (value.__type === TYPE_MARKERS.BIGINT) {
          try {
            return BigInt(value.value);
          } catch {
            return value.value;
          }
        }

        // 处理特殊对象类型
        if (reviveSpecialObjects) {
          // 恢复Date
          if (value.__type === TYPE_MARKERS.DATE) {
            return new Date(value.value);
          }

          // 恢复RegExp
          if (value.__type === TYPE_MARKERS.REGEXP) {
            return new RegExp(value.source, value.flags);
          }

          // 恢复Map
          if (value.__type === TYPE_MARKERS.MAP) {
            return new Map(value.entries);
          }

          // 恢复Set
          if (value.__type === TYPE_MARKERS.SET) {
            return new Set(value.values);
          }

          // 恢复Buffer
          if (value.__type === TYPE_MARKERS.BUFFER) {
            return Buffer.from(value.data, 'base64');
          }

          // 恢复Error
          if (value.__type === TYPE_MARKERS.ERROR) {
            const error = new Error(value.message);
            error.name = value.name;
            error.stack = value.stack;
            return error;
          }
        }

        // 恢复函数
        if (reviveFunctions && value.__type === TYPE_MARKERS.FUNCTION) {
          if (safeMode) {
            // 安全模式下不解析函数，只返回函数源码
            return value.source;
          } else {
            try {
              // 尝试解析函数
              const funcBody = value.source.trim();
              if (funcBody.startsWith('function')) {
                // 常规函数
                return new Function('return ' + funcBody)();
              } else if (funcBody.startsWith('(') || funcBody.includes('=>')) {
                // 箭头函数
                return new Function('return ' + funcBody)();
              }
              // 回退到序列化的字符串
              return value.source;
            } catch (e) {
              console.warn('反序列化函数失败:', e);
              return value.source;
            }
          }
        }

        // 处理循环引用标记
        if (value.__type === TYPE_MARKERS.CIRCULAR) {
          // 由于JSON.parse是递归处理的，需要在解析完成后处理循环引用
          const refPath = value.value;
          const currentParent: Record<string, any> = {};

          // 稍后解析
          setTimeout(() => {
            if (key && refPath) {
              refMap.set(key, { path: refPath, parent: currentParent });
            }
          }, 0);
          return {}; // 临时占位符
        }
      }

      // 存储根对象，用于后续解析循环引用
      if (key === '' && value !== null && typeof value === 'object') {
        rootObject = value;

        // 在对象解析完成后，处理循环引用
        setTimeout(() => {
          for (const [key, { path }] of refMap.entries()) {
            // TODO: 实现从路径获取引用对象
            // 这里需要一个函数来根据路径获取对象引用
            console.log(`需要处理循环引用: ${key} -> ${path}`);
          }
        }, 0);
      }

      return value;
    };

    // 使用JSON.parse反序列化
    const parsed = JSON.parse(data, customReviver) as T;

    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 安全合并对象，处理特殊类型
 * 使用现有的deepMerge实现
 *
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export function safeMerge<T>(target: T, ...sources: any[]): T {
  if (!target || typeof target !== 'object') {
    return target;
  }

  // 处理源对象
  const validSources = sources.filter(
    (source) => source && typeof source === 'object'
  );

  if (validSources.length === 0) {
    return deepClone(target);
  }

  // 使用deepMerge执行合并
  return deepMerge(target, ...validSources) as unknown as T;
}
