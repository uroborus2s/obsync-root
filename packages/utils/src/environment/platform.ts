/**
 * 平台检测工具函数
 * 提供用于检测当前运行环境和平台的功能
 */

/**
 * 检查是否在Node.js环境中运行
 *
 * @returns 如果在Node.js环境中运行则返回true，否则返回false
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  );
}

/**
 * 检查是否在浏览器环境中运行
 *
 * @returns 如果在浏览器环境中运行则返回true，否则返回false
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
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
