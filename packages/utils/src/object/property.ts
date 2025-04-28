/**
 * 对象属性访问相关函数
 */

/**
 * 将路径字符串或数组转换为数组
 * @param path 属性路径，可以是字符串（以点分隔）或数组
 * @returns 路径数组
 */
function toPath(path: string | Array<string | number>): Array<string | number> {
  if (Array.isArray(path)) {
    return path;
  }

  // 处理方括号表示法，如 'user[0].name'
  return path
    .replace(/\[(\w+)\]/g, '.$1') // 将 [0] 转换为 .0
    .split('.')
    .filter((key) => key !== '');
}

/**
 * 获取对象中指定路径的值，支持嵌套属性访问
 * @param object 要获取值的对象
 * @param path 属性路径，可以是字符串（以点分隔）或数组
 * @param defaultValue 如果路径解析为undefined，则返回的默认值
 * @returns 解析的值或默认值
 */
export function get(
  object: any,
  path: string | Array<string | number>,
  defaultValue?: any
): any {
  if (object === null || object === undefined) {
    return defaultValue;
  }

  const keys = toPath(path);
  let result = object;

  for (const key of keys) {
    // 如果当前层级不是对象或当前键不存在，则返回默认值
    if (
      result === null ||
      result === undefined ||
      !Object.prototype.hasOwnProperty.call(result, key)
    ) {
      return defaultValue;
    }

    result = result[key];
  }

  return result === undefined ? defaultValue : result;
}

/**
 * 在对象上设置指定路径的值，支持创建嵌套属性
 * @param object 要修改的对象
 * @param path 属性路径，可以是字符串（以点分隔）或数组
 * @param value 要设置的值
 * @returns 修改后的对象
 */
export function set(
  object: any,
  path: string | Array<string | number>,
  value: any
): any {
  if (object === null || object === undefined) {
    object = {};
  }

  const keys = toPath(path);

  // 如果路径为空，直接返回对象
  if (keys.length === 0) {
    return object;
  }

  let current = object;
  const lastIndex = keys.length - 1;

  for (let i = 0; i < lastIndex; i++) {
    const key = keys[i];

    // 如果当前位置不是对象，创建一个空对象或数组
    if (current[key] === undefined) {
      // 如果下一个键是数字，创建数组；否则创建对象
      current[key] = typeof keys[i + 1] === 'number' ? [] : {};
    }

    current = current[key];
  }

  // 设置最终值
  const lastKey = keys[lastIndex];
  current[lastKey] = value;

  return object;
}

/**
 * 检查对象是否包含指定路径的属性
 * @param object 要检查的对象
 * @param path 属性路径，可以是字符串（以点分隔）或数组
 * @returns 如果路径存在，则返回true，否则返回false
 */
export function has(
  object: any,
  path: string | Array<string | number>
): boolean {
  if (object === null || object === undefined) {
    return false;
  }

  const keys = toPath(path);
  let current = object;

  for (const key of keys) {
    // 如果当前层级不是对象或当前键不存在，则返回false
    if (
      current === null ||
      current === undefined ||
      !Object.prototype.hasOwnProperty.call(current, key)
    ) {
      return false;
    }

    current = current[key];
  }

  return true;
}

/**
 * 检查值是否为对象
 * @param item 需要检查的值
 * @returns 如果值为对象则返回true，否则返回false
 */
export function isObject(item: any): boolean {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}
