/**
 * 字符串格式化相关函数
 */

/**
 * 截断字符串，如果超出指定长度则添加省略符号
 * @param str 要截断的字符串
 * @param options 截断选项
 *   - length: 截断长度，默认为30
 *   - omission: 省略符号，默认为'...'
 *   - separator: (可选) 在哪里截断的分隔符
 * @returns 截断后的字符串
 */
export function truncate(
  str: string,
  options: {
    length?: number;
    omission?: string;
    separator?: RegExp | string;
  } = {}
): string {
  if (!str) return str;

  const length = options.length || 30;
  const omission = options.omission || '...';
  const separator = options.separator;

  if (str.length <= length) return str;

  let truncated = str.substring(0, length - omission.length);

  if (separator) {
    if (typeof separator === 'string') {
      const lastSeparatorIndex = truncated.lastIndexOf(separator);
      if (lastSeparatorIndex >= 0) {
        truncated = truncated.substring(0, lastSeparatorIndex);
      }
    } else if (separator instanceof RegExp) {
      const matches = truncated.match(separator);
      if (matches && matches.length > 0) {
        const lastMatchIndex = truncated.lastIndexOf(
          matches[matches.length - 1]
        );
        if (lastMatchIndex >= 0) {
          truncated = truncated.substring(0, lastMatchIndex);
        }
      }
    }
  }

  return truncated + omission;
}

/**
 * 转义HTML特殊字符
 * @param str 输入字符串
 * @returns 转义后的字符串
 */
export function escape(str: string): string {
  if (!str) return str;

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

/**
 * 反转义HTML特殊字符
 * @param str 输入字符串
 * @returns 反转义后的字符串
 */
export function unescape(str: string): string {
  if (!str) return str;

  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  };

  return str.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (match) => htmlUnescapes[match]
  );
}

/**
 * 使用提供的值来插入字符串模板中的占位符
 * @param str 包含占位符的模板字符串，使用{{name}}形式的占位符
 * @param values 要替换的值对象
 * @returns 替换后的字符串
 */
export function template(str: string, values: Record<string, any>): string {
  if (!str) return str;

  return str.replace(/{{([^{}]+)}}/g, (_, path) => {
    // 支持嵌套属性路径，如 project.name
    const keys = path.trim().split('.');
    let result = values;

    for (const key of keys) {
      if (result === undefined || result === null) {
        return '';
      }
      result = result[key];
    }

    return result !== undefined ? String(result) : '';
  });
}
