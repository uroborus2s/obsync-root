// 路径解析器
// 负责路径的解析和处理

import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep
} from 'path';
import { fileURLToPath } from 'url';

/**
 * 路径信息接口
 */
export interface PathInfo {
  /** 完整路径 */
  fullPath: string;
  /** 目录路径 */
  dir: string;
  /** 文件名（包含扩展名） */
  base: string;
  /** 文件名（不含扩展名） */
  name: string;
  /** 扩展名 */
  ext: string;
  /** 是否为绝对路径 */
  isAbsolute: boolean;
}

/**
 * 路径解析器
 * 负责各种路径操作和解析，采用函数式编程风格
 */
export class PathResolver {
  /**
   * 解析绝对路径
   */
  static resolve(...paths: string[]): string {
    return resolve(...paths);
  }

  /**
   * 连接路径
   */
  static join(...paths: string[]): string {
    return join(...paths);
  }

  /**
   * 获取目录名
   */
  static dirname(path: string): string {
    return dirname(path);
  }

  /**
   * 获取文件名
   */
  static basename(path: string, ext?: string): string {
    return basename(path, ext);
  }

  /**
   * 获取文件扩展名
   */
  static extname(path: string): string {
    return extname(path);
  }

  /**
   * 规范化路径
   */
  static normalize(path: string): string {
    return normalize(path);
  }

  /**
   * 检查路径是否为绝对路径
   */
  static isAbsolute(path: string): boolean {
    return isAbsolute(path);
  }

  /**
   * 获取相对路径
   */
  static relative(from: string, to: string): string {
    return relative(from, to);
  }

  /**
   * 解析路径信息
   */
  static parse(path: string): PathInfo {
    const normalizedPath = PathResolver.normalize(path);
    const dir = PathResolver.dirname(normalizedPath);
    const base = PathResolver.basename(normalizedPath);
    const ext = PathResolver.extname(normalizedPath);
    const name = PathResolver.basename(normalizedPath, ext);

    return {
      fullPath: normalizedPath,
      dir,
      base,
      name,
      ext,
      isAbsolute: PathResolver.isAbsolute(normalizedPath)
    };
  }

  /**
   * 从 URL 转换为文件路径
   */
  static fromURL(url: string | URL): string {
    return fileURLToPath(url);
  }

  /**
   * 转换为 POSIX 路径（使用 / 分隔符）
   */
  static toPosix(path: string): string {
    return path.split(sep).join('/');
  }

  /**
   * 转换为平台特定路径
   */
  static toPlatform(path: string): string {
    return path.split('/').join(sep);
  }

  /**
   * 确保路径以指定字符结尾
   */
  static ensureTrailing(path: string, char: string = '/'): string {
    return path.endsWith(char) ? path : path + char;
  }

  /**
   * 确保路径不以指定字符结尾
   */
  static removeTrailing(path: string, char: string = '/'): string {
    return path.endsWith(char) ? path.slice(0, -char.length) : path;
  }

  /**
   * 确保路径以指定字符开头
   */
  static ensureLeading(path: string, char: string = '/'): string {
    return path.startsWith(char) ? path : char + path;
  }

  /**
   * 确保路径不以指定字符开头
   */
  static removeLeading(path: string, char: string = '/'): string {
    return path.startsWith(char) ? path.slice(char.length) : path;
  }

  /**
   * 获取路径深度
   */
  static getDepth(path: string): number {
    const normalizedPath = PathResolver.normalize(path);
    const parts = normalizedPath
      .split(sep)
      .filter((part) => part && part !== '.');
    return parts.length;
  }

  /**
   * 检查路径是否在指定目录内
   */
  static isWithin(childPath: string, parentPath: string): boolean {
    const normalizedChild = PathResolver.resolve(childPath);
    const normalizedParent = PathResolver.resolve(parentPath);
    const relativePath = PathResolver.relative(
      normalizedParent,
      normalizedChild
    );

    return !relativePath.startsWith('..') && !isAbsolute(relativePath);
  }

  /**
   * 获取公共路径前缀
   */
  static getCommonPrefix(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) return PathResolver.dirname(paths[0]);

    const normalizedPaths = paths.map((p) => PathResolver.normalize(p));
    const parts = normalizedPaths[0].split(sep);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!normalizedPaths.every((p) => p.split(sep)[i] === part)) {
        return parts.slice(0, i).join(sep);
      }
    }

    return parts.join(sep);
  }

  /**
   * 替换文件扩展名
   */
  static replaceExtension(path: string, newExt: string): string {
    const pathInfo = PathResolver.parse(path);
    const ext = newExt.startsWith('.') ? newExt : '.' + newExt;
    return PathResolver.join(pathInfo.dir, pathInfo.name + ext);
  }

  /**
   * 添加后缀到文件名
   */
  static addSuffix(path: string, suffix: string): string {
    const pathInfo = PathResolver.parse(path);
    return PathResolver.join(
      pathInfo.dir,
      pathInfo.name + suffix + pathInfo.ext
    );
  }

  /**
   * 批量解析路径
   */
  static parseMultiple(paths: string[]): PathInfo[] {
    return paths.map((path) => PathResolver.parse(path));
  }
}
