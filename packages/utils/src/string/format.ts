/**
 * 字符串格式化相关函数
 *
 * 本模块提供字符串的格式化操作，包括截断、转义、模板渲染等功能。
 *
 * @packageDocumentation
 */

/**
 * 截断字符串，如果超出指定长度则添加省略符号
 *
 * @param str - 要截断的字符串
 * @param options - 截断选项
 *   - length: 截断长度，默认为30
 *   - omission: 省略符号，默认为'...'
 *   - separator: (可选) 在哪里截断的分隔符，可以是字符串或正则表达式
 * @returns 截断后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串格式化
 *
 * @example
 * ```typescript
 * truncate('hello world', { length: 5 });                     // 'he...'
 * truncate('hello world', { length: 8, omission: '...' });    // 'hello...'
 * truncate('hello world', { length: 10, separator: ' ' });    // 'hello...'
 * ```
 * @public
 */
export function truncate(
  str: string,
  options: {
    length?: number;
    omission?: string;
    separator?: RegExp | string;
  } = {}
): string {
  let result = str;

  if (str) {
    const length = options.length || 30;
    const omission = options.omission || '...';
    const separator = options.separator;

    if (str.length > length) {
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

      result = truncated + omission;
    }
  }

  return result;
}

/**
 * 转义HTML特殊字符
 *
 * 将HTML特殊字符转换为对应的HTML实体，防止XSS攻击。
 *
 * @param str - 输入字符串
 * @returns 转义后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 安全处理
 *
 * @example
 * ```typescript
 * escape('<div>Hello & welcome</div>');
 * // '&lt;div&gt;Hello &amp; welcome&lt;/div&gt;'
 * ```
 * @public
 */
export function escape(str: string): string {
  let result = str;

  if (str) {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    result = str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
  }

  return result;
}

/**
 * 反转义HTML特殊字符
 *
 * 将HTML实体转换回对应的HTML特殊字符。
 *
 * @param str - 输入字符串
 * @returns 反转义后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 安全处理
 *
 * @example
 * ```typescript
 * unescape('&lt;div&gt;Hello &amp; welcome&lt;/div&gt;');
 * // '<div>Hello & welcome</div>'
 * ```
 * @public
 */
export function unescape(str: string): string {
  let result = str;

  if (str) {
    const htmlUnescapes: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };

    result = str.replace(
      /&(?:amp|lt|gt|quot|#39);/g,
      (match) => htmlUnescapes[match]
    );
  }

  return result;
}

/**
 * 使用提供的值来插入字符串模板中的占位符
 *
 * 支持使用\{\{name\}\}形式的占位符，并支持嵌套属性访问（使用点表示法）。
 *
 * @param str - 包含占位符的模板字符串，使用\{\{name\}\}形式的占位符
 * @param values - 要替换的值对象
 * @returns 替换后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串格式化
 *
 * @example
 * ```typescript
 * template('Hello, \{\{name\}\}!', { name: 'John' });
 * // 'Hello, John!'
 *
 * template('\{\{user.name\}\} is \{\{user.age\}\} years old', {
 *   user: { name: 'Alice', age: 30 }
 * });
 * // 'Alice is 30 years old'
 * ```
 * @public
 */
export function template(str: string, values: Record<string, any>): string {
  let result = str;

  if (str) {
    result = str.replace(/{{([^{}]+)}}/g, (_, path) => {
      // 支持嵌套属性路径，如 project.name
      const keys = path.trim().split('.');
      let value = values;
      let isEmpty = false;

      for (const key of keys) {
        if (value === undefined || value === null) {
          isEmpty = true;
          break;
        }
        value = value[key];
      }

      if (isEmpty) {
        return '';
      }

      return value !== undefined ? String(value) : '';
    });
  }

  return result;
}

/**
 * 格式化字符串，支持按照索引或名称的参数替换
 *
 * 使用类似printf的语法：%s表示字符串，%d表示数字，%j表示JSON。
 * 也可以使用命名参数，如%(name)s。
 *
 * @param template - 格式化模板
 * @param args - 用于替换的参数，可以是数组或对象
 * @returns 格式化后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串格式化
 *
 * @example
 * ```typescript
 * format('Hello, %s!', 'world');                  // 'Hello, world!'
 * format('Count: %d', 42);                        // 'Count: 42'
 * format('Data: %j', { name: 'John' });           // 'Data: {"name":"John"}'
 * format('Hello, %(name)s!', { name: 'John' });   // 'Hello, John!'
 * ```
 * @public
 */
export function format(template: string, ...args: any[]): string {
  let result = template;

  if (template && args.length > 0) {
    // 如果第一个参数是对象，使用命名参数替换
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      result = template.replace(/%\(([^)]+)\)([sdj])/g, (_, key, type) => {
        const value = args[0][key];

        switch (type) {
          case 's':
            return String(value);
          case 'd':
            return Number(value).toString();
          case 'j':
            return JSON.stringify(value);
          default:
            return '';
        }
      });
    } else {
      // 使用位置参数替换
      let index = 0;
      result = template.replace(/%([sdj])/g, (match, type) => {
        if (index >= args.length) return match;
        const value = args[index++];

        switch (type) {
          case 's':
            return String(value);
          case 'd':
            return Number(value).toString();
          case 'j':
            return JSON.stringify(value);
          default:
            return '';
        }
      });
    }
  }

  return result;
}
