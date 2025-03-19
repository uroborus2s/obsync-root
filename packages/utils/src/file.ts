import { accessSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export interface FindRootOptions {
  cwd?: string;
  markerFiles?: string[];
  stopMarkers?: string[];
  filter?: (dir: string) => boolean;
  __dirname?: string;
}

const REPO_MARKERS = ['pnpm-workspace.yaml'];

const PROJECT_MARKERS = ['package.json'];

function getWorkingDirectory(): string {
  // PNPM_SCRIPT_SRC_DIR 环境变量包含了实际执行脚本的目录
  const scriptDir = process.env.PNPM_SCRIPT_SRC_DIR;
  if (scriptDir && existsSync(scriptDir)) {
    return scriptDir;
  }

  // 降级使用当前工作目录
  return process.cwd();
}

/**
 * 查找项目根目录
 * @returns {string} 项目根目录的路径
 */
export function findProjectRoot(options: FindRootOptions = {}): string {
  const defauleDirectory = getWorkingDirectory();
  const {
    cwd = defauleDirectory,
    markerFiles = PROJECT_MARKERS,
    stopMarkers = REPO_MARKERS,
    filter
  } = options;

  let currentDir = cwd;
  let projectRoot = null;

  while (currentDir !== dirname(currentDir)) {
    // 检查是否找到项目标记文件
    for (const marker of markerFiles) {
      if (existsSync(resolve(currentDir, marker))) {
        if (!filter || filter(currentDir)) {
          projectRoot = currentDir;
          break;
        }
      }
    }

    // 如果找到项目根目录则返回
    if (projectRoot) {
      break;
    }

    // 检查是否到达仓库根目录
    for (const marker of stopMarkers) {
      if (existsSync(resolve(currentDir, marker))) {
        return currentDir;
      }
    }

    // 向上一级目录查找
    currentDir = dirname(currentDir);
  }

  // 如果找不到，返回当前工作目录
  return projectRoot || defauleDirectory;
}

export function checkFileExistsSync(filePath: string): boolean {
  try {
    accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

// 同步获取模块路径的函数// 定义 Meta 类型，用于表示 ESM 中的 import.meta
type Meta = { url: string } | undefined;

/**
 * 同步获取模块路径的函数
 * @param meta - ESM 环境中的 import.meta 对象，CommonJS 环境传入 undefined
 * @returns 包含 __filename 和 __dirname 的对象
 */
export function getModulePaths(meta: Meta): {
  __filename: string;
  __dirname: string;
} {
  let fileName: string;
  let dirName: string;
  if (meta && typeof meta.url === 'string') {
    // ESM 环境
    fileName = fileURLToPath(meta.url);
    dirName = dirname(fileName);
  } else {
    // CommonJS 环境
    fileName = __filename;
    dirName = __dirname;
  }
  return { __filename: fileName, __dirname: dirName };
}
