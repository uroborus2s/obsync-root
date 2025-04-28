/**
 * 对象属性选择相关函数
 */

/**
 * 创建一个从对象中选取指定属性的新对象
 * @param object 源对象
 * @param paths 要选取的属性路径数组或单个属性
 * @returns 包含选定属性的新对象
 */
export function pick<T extends object, K extends keyof T>(
  object: T,
  paths: K[] | K
): Partial<T> {
  if (object == null) {
    return {};
  }

  const result: Partial<T> = {};
  const props = Array.isArray(paths) ? paths : [paths];

  for (const path of props) {
    if (path in object) {
      result[path] = object[path];
    }
  }

  return result;
}

/**
 * 创建一个从对象中排除指定属性的新对象
 * @param object 源对象
 * @param paths 要排除的属性路径数组或单个属性
 * @returns 不包含排除属性的新对象
 */
export function omit<T extends object, K extends keyof T>(
  object: T,
  paths: K[] | K
): Partial<T> {
  if (object == null) {
    return {};
  }

  const result = { ...object };
  const props = Array.isArray(paths) ? paths : [paths];

  props.forEach((prop) => delete result[prop]);

  return result;
}
