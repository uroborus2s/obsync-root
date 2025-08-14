/**
 * 身份验证工具函数
 * 提供路径白名单检查等辅助功能
 */

/**
 * 检查路径是否在白名单中
 */
export function isWhitelistedPath(path: string): boolean {
  const whitelistPaths = [
    '/health',
    '/metrics',
    '/status',
    '/docs',
    '/swagger',
    '/api/auth/authorization',
    '/api/auth/verify',
    '/api/auth/logout',
    '/api/auth/refresh'
  ];

  return whitelistPaths.some((whitelistPath) => {
    // 支持通配符匹配
    if (whitelistPath.endsWith('*')) {
      const prefix = whitelistPath.slice(0, -1);
      return path.startsWith(prefix);
    }
    // 精确匹配
    return path === whitelistPath;
  });
}
