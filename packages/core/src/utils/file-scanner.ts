// 文件扫描器
// 负责文件系统的扫描和模式匹配

import { readdir } from 'fs/promises';
import { join } from 'path';
import { ErrorUtils } from './error-utils.js';

/**
 * 扫描选项
 */
export interface ScanOptions {
  /** 工作目录 */
  cwd?: string;
  /** 是否递归扫描 */
  recursive?: boolean;
  /** 排除模式 */
  exclude?: string[];
  /** 包含隐藏文件 */
  includeHidden?: boolean;
  /** 最大深度 */
  maxDepth?: number;
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 文件路径 */
  path: string;
  /** 文件名 */
  name: string;
  /** 文件大小 */
  size: number;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 是否为文件 */
  isFile: boolean;
  /** 最后修改时间 */
  lastModified: Date;
  /** 文件扩展名 */
  extension: string;
}

/**
 * 文件扫描器
 * 负责基于 glob 模式扫描文件，采用函数式编程风格
 */
export class FileScanner {
  /**
   * 扫描文件 - 支持 glob 模式
   */
  static async scanFiles(
    pattern: string,
    options: ScanOptions = {}
  ): Promise<string[]> {
    const {
      cwd = process.cwd(),
      recursive = true,
      exclude = [],
      includeHidden = false
    } = options;

    try {
      const files = await FileScanner.scanDirectory(cwd, {
        recursive,
        exclude,
        includeHidden,
        filesOnly: true
      });

      return FileScanner.filterByPattern(files, pattern);
    } catch (error) {
      throw ErrorUtils.wrapError(error, {
        context: `Failed to scan files with pattern "${pattern}"`
      });
    }
  }

  /**
   * 递归扫描目录 - 内部辅助函数
   */
  private static async scanDirectory(
    dirPath: string,
    options: {
      recursive?: boolean;
      exclude?: string[];
      includeHidden?: boolean;
      filesOnly?: boolean;
      directoriesOnly?: boolean;
      currentDepth?: number;
      maxDepth?: number;
    } = {}
  ): Promise<string[]> {
    const {
      recursive = true,
      exclude = [],
      includeHidden = false,
      filesOnly = false,
      directoriesOnly = false,
      currentDepth = 0,
      maxDepth = Infinity
    } = options;

    if (currentDepth >= maxDepth) {
      return [];
    }

    const results: string[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // 跳过隐藏文件（除非明确包含）
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // 检查排除模式
        if (FileScanner.shouldExclude(fullPath, exclude)) {
          continue;
        }

        if (entry.isDirectory()) {
          if (!filesOnly) {
            results.push(fullPath);
          }

          if (recursive) {
            const subResults = await FileScanner.scanDirectory(fullPath, {
              ...options,
              currentDepth: currentDepth + 1
            });
            results.push(...subResults);
          }
        } else if (entry.isFile() && !directoriesOnly) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略无权限访问的目录
      if (error instanceof Error && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== 'EACCES' && nodeError.code !== 'EPERM') {
          throw error;
        }
      } else {
        throw error;
      }
    }

    return results;
  }
  /**
   * 检查是否应该排除文件/目录
   */
  private static shouldExclude(
    path: string,
    excludePatterns: string[]
  ): boolean {
    return excludePatterns.some((pattern) => {
      // 简单的 glob 模式匹配
      const regex = FileScanner.globToRegex(pattern);
      return regex.test(path);
    });
  }

  /**
   * 根据模式过滤文件列表
   */
  private static filterByPattern(files: string[], pattern: string): string[] {
    const regex = FileScanner.globToRegex(pattern);
    return files.filter((file) => regex.test(file));
  }

  /**
   * 将 glob 模式转换为正则表达式
   */
  private static globToRegex(pattern: string): RegExp {
    // 转义特殊字符
    let regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\+/g, '\\+')
      .replace(/\^/g, '\\^')
      .replace(/\$/g, '\\$')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\|/g, '\\|');

    // 处理 glob 特殊字符
    regexPattern = regexPattern
      .replace(/\\\*/g, '.*') // * 匹配任意字符
      .replace(/\\\?/g, '.'); // ? 匹配单个字符

    return new RegExp(`^${regexPattern}$`);
  }
}
