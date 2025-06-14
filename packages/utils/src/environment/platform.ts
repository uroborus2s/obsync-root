/**
 * 平台检测工具函数
 * 提供浏览器和运行环境检测功能
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境检测
 *
 * @packageDocumentation
 */

// 添加声明以解决类型错误
declare const window: any | undefined;
declare const self: any | undefined;
declare const global: any | undefined;
declare const navigator: any | undefined;

// 创建全局变量以便在不同环境中运行
// 这种方式避免了类型错误，因为我们在运行时动态判断
const _global =
  typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
      ? global
      : typeof self !== 'undefined'
        ? self
        : {};

/**
 * 检测当前环境是否为浏览器环境
 *
 * @returns 如果当前环境是浏览器，则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境检测
 *
 * @example
 * ```typescript
 * if (isBrowser()) {
 *   // 执行浏览器特有的代码
 *   window.addEventListener('resize', handleResize);
 * }
 * ```
 * @public
 */
export function isBrowser(): boolean {
  return (
    typeof _global.window !== 'undefined' &&
    typeof _global.document !== 'undefined'
  );
}

/**
 * 检测当前环境是否为Node.js环境
 *
 * @returns 如果当前环境是Node.js，则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境检测
 *
 * @example
 * ```typescript
 * if (isNode()) {
 *   // 执行Node.js特有的代码
 *   const fs = require('fs');
 *   const content = fs.readFileSync('config.json', 'utf-8');
 * }
 * ```
 * @public
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    typeof process.versions.node !== 'undefined'
  );
}

/**
 * 检测当前环境是否为Web Worker环境
 *
 * @returns 如果当前环境是Web Worker，则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境检测
 * @public
 */
export function isWebWorker(): boolean {
  return (
    typeof self === 'object' &&
    self.constructor &&
    self.constructor.name === 'DedicatedWorkerGlobalScope'
  );
}

/**
 * 检测当前环境是否支持指定的Web API
 *
 * @param apiName - 要检测的Web API名称
 * @returns 如果当前环境支持指定的API，则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境检测
 *
 * 注意: 仅支持浏览器环境
 *
 * @example
 * ```typescript
 * if (supportsWebAPI('IntersectionObserver')) {
 *   // 使用Intersection Observer API
 *   const observer = new IntersectionObserver(callback);
 * } else {
 *   // 使用备选方案
 *   window.addEventListener('scroll', handleScroll);
 * }
 * ```
 * @public
 */
export function supportsWebAPI(apiName: string): boolean {
  if (!isBrowser()) {
    return false;
  }

  const w = _global.window as any;
  return apiName in w;
}

/**
 * 检测浏览器是否支持指定的CSS特性
 *
 * @param property - CSS特性名称
 * @returns 如果当前浏览器支持指定的CSS特性，则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境检测
 *
 * 注意: 仅支持浏览器环境
 *
 * @example
 * ```typescript
 * if (supportsCSS('grid')) {
 *   // 使用CSS Grid布局
 *   element.style.display = 'grid';
 * } else {
 *   // 使用备选布局方案
 *   element.style.display = 'flex';
 * }
 * ```
 * @public
 */
export function supportsCSS(property: string): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    const doc = _global.document as any;
    const element = doc.createElement('div');
    return property in element.style;
  } catch (e) {
    return false;
  }
}

/**
 * 获取主要运行环境信息
 *
 * @returns 包含环境类型和详细信息的对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境检测
 *
 * @example
 * ```typescript
 * const env = getEnvironment();
 * console.log(`当前运行环境: ${env.type}`);
 * if (env.type === 'browser') {
 *   console.log(`浏览器: ${env.browser}`);
 * } else if (env.type === 'node') {
 *   console.log(`Node.js版本: ${env.nodeVersion}`);
 * }
 * ```
 * @public
 */
export function getEnvironment(): {
  type: 'browser' | 'node' | 'webworker' | 'unknown';
  browser?: string;
  nodeVersion?: string;
} {
  if (isBrowser()) {
    try {
      const nav = _global.navigator as any;
      const userAgent = nav.userAgent;
      let browser = 'unknown';

      if (userAgent.indexOf('Chrome') > -1) {
        browser = 'Chrome';
      } else if (userAgent.indexOf('Safari') > -1) {
        browser = 'Safari';
      } else if (userAgent.indexOf('Firefox') > -1) {
        browser = 'Firefox';
      } else if (
        userAgent.indexOf('MSIE') > -1 ||
        userAgent.indexOf('Trident/') > -1
      ) {
        browser = 'Internet Explorer';
      } else if (userAgent.indexOf('Edge') > -1) {
        browser = 'Edge';
      }

      return { type: 'browser', browser };
    } catch (e) {
      return { type: 'browser', browser: 'unknown' };
    }
  }

  if (isNode()) {
    return {
      type: 'node',
      nodeVersion: process.versions.node
    };
  }

  if (isWebWorker()) {
    return { type: 'webworker' };
  }

  return { type: 'unknown' };
}

/**
 * 检查是否在服务端渲染环境中运行
 *
 * @returns 如果在服务端渲染环境中运行则返回true，否则返回false
 */
export function isSSR(): boolean {
  return isNode() && !isBrowser();
}

/**
 * 检测当前操作系统类型
 *
 * @returns 操作系统标识：'windows'、'macos'、'linux'或'unknown'
 */
export function getOSType(): 'windows' | 'macos' | 'linux' | 'unknown' {
  if (!isNode()) {
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.indexOf('win') !== -1) return 'windows';
      if (userAgent.indexOf('mac') !== -1) return 'macos';
      if (userAgent.indexOf('linux') !== -1 || userAgent.indexOf('x11') !== -1)
        return 'linux';
    }
    return 'unknown';
  }

  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  return 'unknown';
}

/**
 * 获取当前浏览器信息
 *
 * @returns 浏览器信息对象，如果不在浏览器环境中则返回null
 */
export function getBrowserInfo(): { name: string; version: string } | null {
  if (!isBrowser()) {
    return null;
  }

  const ua = navigator.userAgent;
  let browserName = 'unknown';
  let version = 'unknown';

  // 检测主流浏览器
  if (ua.indexOf('Edge') > -1) {
    browserName = 'Edge';
    version = ua.match(/Edge\/(\d+\.\d+)/)
      ? ua.match(/Edge\/(\d+\.\d+)/)![1]
      : 'unknown';
  } else if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    version = ua.match(/Firefox\/(\d+\.\d+)/)
      ? ua.match(/Firefox\/(\d+\.\d+)/)![1]
      : 'unknown';
  } else if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    version = ua.match(/Chrome\/(\d+\.\d+)/)
      ? ua.match(/Chrome\/(\d+\.\d+)/)![1]
      : 'unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari';
    version = ua.match(/Version\/(\d+\.\d+)/)
      ? ua.match(/Version\/(\d+\.\d+)/)![1]
      : 'unknown';
  } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
    browserName = 'Internet Explorer';
    version = ua.match(/(?:MSIE |rv:)(\d+\.\d+)/)
      ? ua.match(/(?:MSIE |rv:)(\d+\.\d+)/)![1]
      : 'unknown';
  }

  return {
    name: browserName,
    version
  };
}
