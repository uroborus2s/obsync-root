/**
 * 目录路径处理工具函数
 * 提供获取当前文件目录路径和文件路径的功能，兼容ES模块和CommonJS模块
 */

import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * 获取当前文件所在的目录路径，兼容ES模块和CommonJS模块
 *
 * @param importMetaUrl ES模块中的import.meta.url，在CommonJS中可选
 * @returns 当前文件所在的目录路径
 */
export function getCurrentDirname(importMetaUrl?: string): string {
  // 检查是否为ES模块
  if (typeof importMetaUrl === 'string') {
    // ES模块中使用fileURLToPath将URL转换为路径
    const __filename = fileURLToPath(importMetaUrl);
    return path.dirname(__filename);
  }

  // CommonJS模块中，直接使用全局的__dirname
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // 后备方案，返回当前工作目录
  // 在某些环境中可能不准确，仅作为备用
  return process.cwd();
}

/**
 * 获取当前文件的完整路径，兼容ES模块和CommonJS模块
 *
 * @param importMetaUrl ES模块中的import.meta.url，在CommonJS中可选
 * @returns 当前文件的完整路径
 */
export function getCurrentFilename(importMetaUrl?: string): string {
  // 检查是否为ES模块
  if (typeof importMetaUrl === 'string') {
    // ES模块中使用fileURLToPath将URL转换为路径
    return fileURLToPath(importMetaUrl);
  }

  // CommonJS模块中，直接使用全局的__filename
  if (typeof __filename !== 'undefined') {
    return __filename;
  }

  // 后备方案，返回当前工作目录加上一个占位符文件名
  // 在某些环境中可能不准确，仅作为备用
  return path.join(process.cwd(), 'current-file.js');
}
