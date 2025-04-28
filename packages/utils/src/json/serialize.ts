/**
 * 基础JSON序列化模块
 * 提供简单高效的JSON序列化功能
 *
 * 适用场景：
 * - 普通数据对象的序列化
 * - 需要格式化或紧凑输出的场景
 * - 处理简单的Date和RegExp对象
 * - 处理基本的循环引用检测
 *
 * 不适用场景：
 * - 包含复杂类型的对象（Map、Set、Buffer等）
 * - 包含函数的对象
 * - 需要完整恢复特殊类型的场景
 *
 * 对于复杂对象，请使用 enhancedSerialize/enhancedDeserialize
 */

/**
 * 序列化选项接口
 */
export interface SerializeOptions {
  /**
   * 缩进空格数量
   */
  indent?: number;
  /**
   * 是否包含undefined值
   */
  includeUndefined?: boolean;
  /**
   * 自定义替换函数
   */
  replacer?: (key: string, value: any) => any;
  /**
   * 是否移除字段值为null的字段
   */
  removeNull?: boolean;
  /**
   * 是否转换日期为ISO字符串
   */
  convertDates?: boolean;
  /**
   * 是否转换正则表达式为字符串
   */
  convertRegExp?: boolean;
}

/**
 * 序列化结果接口
 */
export interface SerializeResult {
  /**
   * 是否成功
   */
  success: boolean;
  /**
   * 序列化后的JSON字符串
   */
  data?: string;
  /**
   * 错误信息
   */
  error?: string;
}

/**
 * 自定义序列化对象为JSON字符串
 *
 * @param value 待序列化的对象
 * @param options 序列化选项
 * @returns 序列化结果
 */
export function serialize(
  value: any,
  options: SerializeOptions = {}
): SerializeResult {
  try {
    const {
      indent = 0,
      includeUndefined = false,
      replacer,
      removeNull = false,
      convertDates = true,
      convertRegExp = true
    } = options;

    // 自定义替换函数
    const customReplacer = (key: string, value: any): any => {
      // 应用用户自定义替换函数
      if (replacer) {
        value = replacer(key, value);
      }

      // 跳过undefined值
      if (!includeUndefined && value === undefined) {
        return undefined;
      }

      // 移除null值
      if (removeNull && value === null) {
        return undefined;
      }

      // 转换Date对象为ISO字符串
      if (convertDates && value instanceof Date) {
        return value.toISOString();
      }

      // 转换RegExp对象为字符串
      if (convertRegExp && value instanceof RegExp) {
        return value.toString();
      }

      return value;
    };

    const jsonString = JSON.stringify(value, customReplacer, indent);

    return {
      success: true,
      data: jsonString
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 序列化对象为紧凑JSON字符串（无空格和缩进）
 *
 * @param value 待序列化的对象
 * @param options 序列化选项
 * @returns 序列化结果
 */
export function serializeCompact(
  value: any,
  options: Omit<SerializeOptions, 'indent'> = {}
): SerializeResult {
  return serialize(value, { ...options, indent: 0 });
}

/**
 * 序列化对象为格式化的JSON字符串（带缩进）
 *
 * @param value 待序列化的对象
 * @param indent 缩进空格数量
 * @param options 序列化选项
 * @returns 序列化结果
 */
export function serializePretty(
  value: any,
  indent: number = 2,
  options: Omit<SerializeOptions, 'indent'> = {}
): SerializeResult {
  return serialize(value, { ...options, indent });
}

/**
 * 安全序列化（处理循环引用）
 *
 * @param value 待序列化的对象
 * @param options 序列化选项
 * @returns 序列化结果
 */
export function serializeSafe(
  value: any,
  options: SerializeOptions = {}
): SerializeResult {
  try {
    const seen = new WeakSet();

    const customReplacer = (key: string, value: any): any => {
      // 处理循环引用
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }

      return value;
    };

    // 合并用户自定义replacer和处理循环引用的replacer
    const originalReplacer = options.replacer;
    const combinedReplacer = (key: string, value: any): any => {
      value = customReplacer(key, value);
      if (originalReplacer && value !== '[Circular]') {
        value = originalReplacer(key, value);
      }
      return value;
    };

    return serialize(value, { ...options, replacer: combinedReplacer });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
