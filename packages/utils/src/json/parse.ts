/**
 * 基础JSON解析模块
 * 提供简单高效的JSON解析功能
 *
 * 适用场景：
 * - 普通JSON字符串的解析
 * - 需要恢复基本Date和RegExp对象的场景
 * - 需要安全解析（失败返回默认值）的场景
 * - 需要快速验证JSON有效性的场景
 *
 * 不适用场景：
 * - 需要恢复复杂类型的场景（Map、Set、Buffer等）
 * - 包含特殊标记的自定义序列化JSON
 *
 * 对于复杂JSON数据，请使用 enhancedDeserialize
 */

/**
 * 解析选项接口
 */
export interface ParseOptions {
  /**
   * 是否恢复日期对象
   * 将符合ISO 8601格式的字符串转换为Date对象
   */
  reviveDates?: boolean;

  /**
   * 是否恢复正则表达式
   * 将形如 /pattern/flags 的字符串转换为RegExp对象
   */
  reviveRegExp?: boolean;

  /**
   * 自定义转换函数
   */
  reviver?: (key: string, value: any) => any;
}

/**
 * 解析结果接口
 */
export interface ParseResult<T = any> {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 解析后的数据
   */
  data?: T;

  /**
   * 错误信息
   */
  error?: string;
}

/**
 * 判断字符串是否为有效的JSON字符串
 *
 * @param jsonString JSON字符串
 * @returns 是否有效
 */
export function isValidJSON(jsonString: string): boolean {
  if (typeof jsonString !== 'string') {
    return false;
  }

  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * 增强的JSON解析函数
 *
 * @param jsonString JSON字符串
 * @param options 解析选项
 * @returns 解析结果
 */
export function parse<T = any>(
  jsonString: string,
  options: ParseOptions = {}
): ParseResult<T> {
  try {
    if (typeof jsonString !== 'string') {
      return {
        success: false,
        error: '输入必须是字符串'
      };
    }

    const { reviveDates = true, reviveRegExp = true, reviver } = options;

    // ISO日期格式的正则表达式
    const isoDatePattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?(?:Z|[-+]\d{2}:?\d{2})?$/;

    // 正则表达式字符串的正则表达式
    const regExpPattern = /^\/(.*)\/([gimuy]*)$/;

    // 自定义恢复函数
    const customReviver = (key: string, value: any): any => {
      // 应用用户自定义reviver
      if (reviver) {
        value = reviver(key, value);
      }

      // 恢复日期对象
      if (
        reviveDates &&
        typeof value === 'string' &&
        isoDatePattern.test(value)
      ) {
        const date = new Date(value);
        // 确保日期有效
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // 恢复正则表达式
      if (reviveRegExp && typeof value === 'string') {
        const match = value.match(regExpPattern);
        if (match) {
          try {
            return new RegExp(match[1], match[2]);
          } catch {
            // 如果构造失败，返回原始字符串
          }
        }
      }

      return value;
    };

    const result = JSON.parse(jsonString, customReviver);

    return {
      success: true,
      data: result as T
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 安全的JSON解析函数
 * 如果解析失败，返回默认值而不是抛出异常
 *
 * @param jsonString JSON字符串
 * @param defaultValue 默认值
 * @param options 解析选项
 * @returns 解析结果或默认值
 */
export function parseSafe<T = any>(
  jsonString: string,
  defaultValue: T,
  options: ParseOptions = {}
): T {
  const result = parse<T>(jsonString, options);
  return result.success ? result.data! : defaultValue;
}

/**
 * 尝试解析JSON字符串
 * 和parseSafe类似，但返回一个元组 [data, error]
 *
 * @param jsonString JSON字符串
 * @param options 解析选项
 * @returns [data, error] 元组
 */
export function tryParse<T = any>(
  jsonString: string,
  options: ParseOptions = {}
): [T | undefined, Error | undefined] {
  const result = parse<T>(jsonString, options);
  if (result.success) {
    return [result.data, undefined];
  } else {
    return [undefined, new Error(result.error)];
  }
}
