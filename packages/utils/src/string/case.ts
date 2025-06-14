/**
 * 命名风格转换相关函数
 *
 * 本模块提供各种命名风格转换函数，包括驼峰命名、帕斯卡命名、蛇形命名和烤串命名。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串处理
 *
 * @packageDocumentation
 */

/**
 * 将字符串转换为驼峰式命名（小驼峰）
 *
 * 将字符串中的空格、下划线、中划线移除，并将每个单词的首字母大写（除了第一个单词）。
 *
 * @param string - 要处理的字符串
 * @returns 转换后的驼峰式字符串
 * @throws `TypeError` 如果输入不是字符串类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 命名风格
 *
 * @example
 * ```typescript
 * camelCase('hello world');     // 'helloWorld'
 * camelCase('hello-world');     // 'helloWorld'
 * camelCase('hello_world');     // 'helloWorld'
 * camelCase('Hello World');     // 'helloWorld'
 * ```
 * @public
 */
export function camelCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/[\s_-]+/g, '');
}

/**
 * 将字符串转换为帕斯卡命名（大驼峰）
 *
 * 将字符串中的空格、下划线、中划线移除，并将每个单词的首字母大写。
 *
 * @param string - 要处理的字符串
 * @returns 转换后的帕斯卡命名字符串
 * @throws `TypeError` 如果输入不是字符串类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 命名风格
 *
 * @example
 * ```typescript
 * pascalCase('hello world');    // 'HelloWorld'
 * pascalCase('hello-world');    // 'HelloWorld'
 * pascalCase('hello_world');    // 'HelloWorld'
 * pascalCase('hello World');    // 'HelloWorld'
 * ```
 * @public
 */
export function pascalCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
    .replace(/[\s_-]+/g, '');
}

/**
 * 将字符串转换为蛇形命名（下划线命名）
 *
 * 将字符串中的空格、中划线转换为下划线，将大写字母转换为小写字母，并在大写字母前添加下划线。
 *
 * @param string - 要处理的字符串
 * @returns 转换后的蛇形命名字符串
 * @throws `TypeError` 如果输入不是字符串类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 命名风格
 *
 * @example
 * ```typescript
 * snakeCase('hello world');     // 'hello_world'
 * snakeCase('hello-world');     // 'hello_world'
 * snakeCase('helloWorld');      // 'hello_world'
 * snakeCase('HelloWorld');      // 'hello_world'
 * ```
 * @public
 */
export function snakeCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * 将字符串转换为短横线命名（烤串命名）
 *
 * 将字符串中的空格、下划线转换为中划线，将大写字母转换为小写字母，并在大写字母前添加中划线。
 *
 * @param string - 要处理的字符串
 * @returns 转换后的短横线命名字符串
 * @throws `TypeError` 如果输入不是字符串类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 命名风格
 *
 * @example
 * ```typescript
 * kebabCase('hello world');     // 'hello-world'
 * kebabCase('hello_world');     // 'hello-world'
 * kebabCase('helloWorld');      // 'hello-world'
 * kebabCase('HelloWorld');      // 'hello-world'
 * ```
 * @public
 */
export function kebabCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
