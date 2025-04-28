/**
 * 文件系统操作工具函数
 * 提供文件读写、复制、移动和删除等功能
 */

import { existsSync, mkdirSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 检查给定路径是否存在。
 *
 * @param filepath 要检查的路径
 * @returns 如果路径存在则为true，否则为false
 */
export async function exists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查给定路径是否为目录。
 *
 * @param filepath 要检查的路径
 * @returns 如果是目录则为true，否则为false
 */
export async function isDirectory(filepath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filepath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 检查给定路径是否为常规文件。
 *
 * @param filepath 要检查的路径
 * @returns 如果是文件则为true，否则为false
 */
export async function isFile(filepath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filepath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * 读取文件的全部内容。
 *
 * @param filepath 文件路径
 * @param options 选项对象或编码字符串
 * @returns 文件内容，如果指定了编码则为字符串，否则为Buffer
 */
export async function readFile(
  filepath: string,
  options?: { encoding?: BufferEncoding; flag?: string } | BufferEncoding
): Promise<string | Buffer> {
  return fs.readFile(filepath, options);
}

/**
 * 将数据写入文件，如果文件已存在则覆盖。
 *
 * @param filepath 文件路径
 * @param data 要写入的数据
 * @param options 选项对象或编码字符串
 * @returns 成功时解析为void
 */
export async function writeFile(
  filepath: string,
  data: string | NodeJS.ArrayBufferView,
  options?:
    | { encoding?: BufferEncoding; mode?: number; flag?: string }
    | BufferEncoding
): Promise<void> {
  // 确保目录存在
  const dir = path.dirname(filepath);
  if (dir && dir !== '.' && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return fs.writeFile(filepath, data, options);
}

/**
 * 将文件从源路径复制到目标路径。
 *
 * @param src 源文件路径
 * @param dest 目标文件路径
 * @param options 选项对象
 * @returns 成功时解析为void
 */
export async function copyFile(
  src: string,
  dest: string,
  options?: { overwrite?: boolean; errorOnExist?: boolean }
): Promise<void> {
  const overwrite = options?.overwrite !== false; // 默认为true
  const errorOnExist = options?.errorOnExist === true; // 默认为false

  // 检查目标是否存在
  const destExists = await exists(dest);

  if (destExists && !overwrite) {
    if (errorOnExist) {
      throw Object.assign(new Error(`目标文件已存在: ${dest}`), {
        code: 'EEXIST'
      });
    }
    return; // 如果目标存在且不覆盖，则什么也不做
  }

  // 确保目标目录存在
  const destDir = path.dirname(dest);
  if (destDir && destDir !== '.' && !existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // 复制文件
  return fs.copyFile(src, dest);
}

/**
 * 将文件从源路径移动到目标路径。
 *
 * @param src 源文件路径
 * @param dest 目标文件路径
 * @param options 选项对象
 * @returns 成功时解析为void
 */
export async function moveFile(
  src: string,
  dest: string,
  options?: { overwrite?: boolean }
): Promise<void> {
  const overwrite = options?.overwrite !== false; // 默认为true

  // 确保目标目录存在
  const destDir = path.dirname(dest);
  if (destDir && destDir !== '.' && !existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // 检查源文件是否存在
  if (!(await exists(src))) {
    throw new Error(`源文件不存在: ${src}`);
  }

  // 移动文件
  return fs.rename(src, dest);
}

/**
 * 删除文件或目录。
 *
 * @param filepath 要删除的文件或目录路径
 * @returns 成功时解析为void
 */
export async function removeFile(filepath: string): Promise<void> {
  const isDir = await isDirectory(filepath);

  if (isDir) {
    return fs.rm(filepath, { recursive: true, force: true });
  } else {
    return fs.unlink(filepath).catch(() => {
      // 如果文件不存在，则忽略错误
    });
  }
}

/**
 * 使用glob模式匹配文件路径。
 *
 * @param pattern glob模式
 * @param options 选项对象
 * @returns 匹配的文件路径数组
 */
export async function glob(
  pattern: string,
  options?: { cwd?: string; dot?: boolean; ignore?: string[] }
): Promise<string[]> {
  try {
    // 动态导入glob
    const { glob } = await import('glob');
    return await glob(pattern, options || {});
  } catch (error) {
    console.error('执行glob匹配失败:', error);
    return [];
  }
}
