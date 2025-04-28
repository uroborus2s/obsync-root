/**
 * MIME类型处理工具函数
 * 提供文件MIME类型识别和处理的功能
 */

import * as path from 'path';

// 常见MIME类型映射
const MIME_TYPES: Record<string, string> = {
  // 文本文件
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.xml': 'text/xml',

  // 应用程序文件
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // 图像文件
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  // 音频文件
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',

  // 视频文件
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',

  // 字体文件
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',

  // 其他常见类型
  '.ts': 'application/typescript',
  '.tsx': 'application/typescript',
  '.jsx': 'application/javascript'
};

/**
 * 根据文件路径或扩展名获取MIME类型。
 *
 * @param filepath 文件路径或扩展名
 * @returns MIME类型字符串，如果未知则返回'application/octet-stream'
 */
export function getMimeType(filepath: string): string {
  // 确保有扩展名
  let ext = filepath.startsWith('.') ? filepath : path.extname(filepath);
  ext = ext.toLowerCase();

  return MIME_TYPES[ext] || 'application/octet-stream';
}
