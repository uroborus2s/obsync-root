import { createReadStream, createWriteStream } from 'fs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import * as zlib from 'zlib';
import { RotationOptions } from './types';

const pipelineAsync = promisify(pipeline);

/**
 * 获取文件大小（字节）
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

/**
 * 解析大小字符串为字节数
 * 支持的格式: B, K, KB, M, MB, G, GB
 */
export function parseSize(size: string): number {
  const units: Record<string, number> = {
    B: 1,
    K: 1024,
    KB: 1024,
    M: 1024 * 1024,
    MB: 1024 * 1024,
    G: 1024 * 1024 * 1024,
    GB: 1024 * 1024 * 1024
  };

  const match = size.match(/^(\d+(?:\.\d+)?)([BKMG]B?)?$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();

  return num * (units[unit] || 1);
}

/**
 * 解析时间间隔字符串为毫秒数
 * 支持的格式: ms, s, m, h, d
 */
export function parseInterval(interval: string): number {
  const units: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  const match = interval.match(/^(\d+(?:\.\d+)?)([mshdMS])?$/);
  if (!match) {
    throw new Error(`Invalid interval format: ${interval}`);
  }

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();

  return num * (units[unit] || 1);
}

/**
 * 默认的文件名格式化函数
 */
export function defaultFilenameFormatter(time: number | null): string {
  if (!time) {
    return 'app.log';
  }

  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `app-${year}${month}${day}-${hours}${minutes}.log`;
}

/**
 * 压缩日志文件
 */
async function compressFile(source: string, dest: string): Promise<void> {
  const gzip = zlib.createGzip();
  const sourceStream = createReadStream(source);
  const destStream = createWriteStream(dest);

  try {
    await pipelineAsync(sourceStream, gzip, destStream);
  } catch (err: any) {
    throw new Error(`Failed to compress log file: ${err.message}`);
  }
}

/**
 * 清理旧日志文件，保留指定数量的最新文件
 */
async function cleanupOldLogs(
  dir: string,
  pattern: string,
  maxFiles: number,
  isCompressed = false
): Promise<void> {
  try {
    const allFiles = await fs.readdir(dir);
    const extension = isCompressed ? '.gz' : '.log';
    const logFiles = allFiles
      .filter(
        (file: string) => file.startsWith(pattern) && file.endsWith(extension)
      )
      .map((file: string) => ({
        name: file,
        path: path.join(dir, file),
        time: fs.statSync(path.join(dir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 按修改时间降序排序

    // 保留最新的maxFiles个文件，删除其他文件
    if (logFiles.length > maxFiles) {
      const filesToDelete = logFiles.slice(maxFiles);
      for (const file of filesToDelete) {
        await fs.remove(file.path);
      }
    }
  } catch (err: any) {
    console.error(`Error cleaning up old logs: ${err.message}`);
  }
}

/**
 * 执行基于大小的日志轮转
 */
export async function rotateBySizeIfNeeded(
  filePath: string,
  maxSize: number,
  options: RotationOptions
): Promise<boolean> {
  if (!(await fs.pathExists(filePath))) {
    return false;
  }

  const currentSize = await getFileSize(filePath);
  if (currentSize < maxSize) {
    return false;
  }

  // 执行轮转
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);
  const filenameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const formatter = options.filename || defaultFilenameFormatter;
  const timestamp = Date.now();
  const rotatedFilename = formatter(timestamp);
  const rotatedFilePath = path.join(dir, rotatedFilename);

  // 确保不会覆盖已有文件
  let uniqueRotatedFilePath = rotatedFilePath;
  let counter = 1;
  while (await fs.pathExists(uniqueRotatedFilePath)) {
    uniqueRotatedFilePath = path.join(
      dir,
      `${path.basename(rotatedFilePath, '.log')}-${counter}.log`
    );
    counter++;
  }

  // 轮转文件
  await fs.move(filePath, uniqueRotatedFilePath);

  // 如果需要压缩，进行压缩
  if (options.compress) {
    const compressedPath = `${uniqueRotatedFilePath}.gz`;
    await compressFile(uniqueRotatedFilePath, compressedPath);
    await fs.remove(uniqueRotatedFilePath);

    // 清理旧的压缩日志
    if (options.maxFiles) {
      await cleanupOldLogs(dir, filenameWithoutExt, options.maxFiles, true);
    }
  }
  // 清理旧的未压缩日志
  else if (options.maxFiles) {
    await cleanupOldLogs(dir, filenameWithoutExt, options.maxFiles);
  }

  // 创建新的日志文件
  await fs.ensureFile(filePath);

  return true;
}

/**
 * 创建定时轮转任务
 * 返回一个关闭函数以停止定时轮转
 */
export function setupIntervalRotation(
  filePath: string,
  interval: number,
  options: RotationOptions
): () => void {
  // 第一次轮转时间
  const now = Date.now();
  const nextRotation = Math.ceil(now / interval) * interval;
  const delay = nextRotation - now;

  // 轮转函数
  const rotate = async () => {
    // 如果文件不存在，跳过轮转
    if (!(await fs.pathExists(filePath))) {
      return;
    }

    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);
    const filenameWithoutExt = filename.replace(/\.[^.]+$/, '');
    const formatter = options.filename || defaultFilenameFormatter;
    const timestamp = Date.now();
    const rotatedFilename = formatter(timestamp);
    const rotatedFilePath = path.join(dir, rotatedFilename);

    // 确保不会覆盖已有文件
    let uniqueRotatedFilePath = rotatedFilePath;
    let counter = 1;
    while (await fs.pathExists(uniqueRotatedFilePath)) {
      uniqueRotatedFilePath = path.join(
        dir,
        `${path.basename(rotatedFilePath, '.log')}-${counter}.log`
      );
      counter++;
    }

    // 创建备份
    const tempPath = `${filePath}.temp`;
    await fs.copy(filePath, tempPath);
    await fs.truncate(filePath); // 清空原文件
    await fs.move(tempPath, uniqueRotatedFilePath);

    // 如果需要压缩，进行压缩
    if (options.compress) {
      const compressedPath = `${uniqueRotatedFilePath}.gz`;
      await compressFile(uniqueRotatedFilePath, compressedPath);
      await fs.remove(uniqueRotatedFilePath);

      // 清理旧的压缩日志
      if (options.maxFiles) {
        await cleanupOldLogs(dir, filenameWithoutExt, options.maxFiles, true);
      }
    }
    // 清理旧的未压缩日志
    else if (options.maxFiles) {
      await cleanupOldLogs(dir, filenameWithoutExt, options.maxFiles);
    }
  };

  // 设置定时器
  let timer: NodeJS.Timeout | null = setTimeout(async function runRotation() {
    try {
      await rotate();
    } catch (err: any) {
      console.error(`Error rotating log file: ${err.message}`);
    }

    // 设置下一次轮转
    timer = setTimeout(runRotation, interval);
  }, delay);

  // 返回清理函数
  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

/**
 * 设置日志轮转
 */
export function setupRotation(
  filePath: string,
  options: RotationOptions
): () => void {
  const cleanupFunctions: Array<() => void> = [];

  // 基于大小的轮转
  if (options.size) {
    const maxSize = parseSize(options.size);
    const checkInterval = options.interval
      ? Math.min(parseInterval(options.interval), 60000) // 最小1分钟
      : 60000; // 默认1分钟

    let timer: NodeJS.Timeout | null = setInterval(async () => {
      try {
        await rotateBySizeIfNeeded(filePath, maxSize, options);
      } catch (err: any) {
        console.error(`Error checking log size: ${err.message}`);
      }
    }, checkInterval);

    cleanupFunctions.push(() => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
  }

  // 基于时间的轮转
  if (options.interval) {
    const intervalMs = parseInterval(options.interval);
    const cleanup = setupIntervalRotation(filePath, intervalMs, options);
    cleanupFunctions.push(cleanup);
  }

  // 返回清理函数
  return () => {
    cleanupFunctions.forEach((fn) => fn());
  };
}
