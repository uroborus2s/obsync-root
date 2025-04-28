/**
 * 文件大小处理工具函数
 * 提供文件大小格式化和处理的功能
 */

/**
 * 格式化文件大小，将字节转换为更友好的格式。
 *
 * @param bytes 文件大小（字节）
 * @param precision 精度（小数位数），默认为2
 * @returns 格式化后的文件大小字符串（如 "1.23 KB"）
 */
export function formatFileSize(bytes: number, precision: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const base = 1024;
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
  const adjustedSize = bytes / Math.pow(base, unitIndex);

  // 处理特殊情况：如果是整字节且小于1024，不显示小数点
  if (unitIndex === 0) {
    return `${bytes} ${units[0]}`;
  }

  return `${adjustedSize.toFixed(precision)} ${units[unitIndex]}`;
}

/**
 * 将文件大小字符串解析为字节数。
 *
 * @param sizeStr 文件大小字符串（如 "1.5 MB"）
 * @returns 字节数，如果解析失败则返回0
 */
export function parseFileSize(sizeStr: string): number {
  const units: Record<string, number> = {
    b: 1,
    bytes: 1,
    kb: 1024,
    kilobyte: 1024,
    kilobytes: 1024,
    mb: 1024 * 1024,
    megabyte: 1024 * 1024,
    megabytes: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    gigabyte: 1024 * 1024 * 1024,
    gigabytes: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
    terabyte: 1024 * 1024 * 1024 * 1024,
    terabytes: 1024 * 1024 * 1024 * 1024,
    pb: 1024 * 1024 * 1024 * 1024 * 1024,
    petabyte: 1024 * 1024 * 1024 * 1024 * 1024,
    petabytes: 1024 * 1024 * 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^([\d.]+)\s*([a-z]+)$/i);
  if (!match) return 0;

  const size = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (isNaN(size) || !units[unit]) return 0;

  return size * units[unit];
}

/**
 * 比较两个文件大小。
 *
 * @param size1 第一个文件大小（字节）
 * @param size2 第二个文件大小（字节）
 * @returns 比较结果：小于0表示size1<size2，等于0表示相等，大于0表示size1>size2
 */
export function compareFileSizes(size1: number, size2: number): number {
  return size1 - size2;
}
