/**
 * Token 缓存服务接口
 * 定义 token 的存储、获取、删除、过期检查等方法
 */

import type { AccessToken } from '../../types/index.js';

/**
 * 服务执行结果
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Token 缓存配置
 */
export interface TokenCacheConfig {
  /** Redis 键前缀 */
  keyPrefix?: string;
  /** 默认过期时间（秒），如果 token 没有 expires_in 字段时使用 */
  defaultTtl?: number;
  /** 提前过期时间（秒），在实际过期前多少秒认为 token 已过期 */
  earlyExpireSeconds?: number;
  /** 是否启用降级模式（Redis 不可用时使用内存存储） */
  enableFallback?: boolean;
}

/**
 * Token 缓存结果
 */
export interface TokenCacheResult {
  /** 是否成功 */
  success: boolean;
  /** Token 数据 */
  token?: AccessToken;
  /** 错误信息 */
  error?: string;
  /** 是否来自降级存储 */
  fromFallback?: boolean;
}

/**
 * Token 缓存服务接口
 */
export interface ITokenCacheService {
  /**
   * 存储 token 到缓存
   * @param appId 应用ID，用作缓存键的一部分
   * @param token 访问令牌对象
   * @returns 存储结果
   */
  setToken(appId: string, token: AccessToken): Promise<ServiceResult<boolean>>;

  /**
   * 从缓存获取 token
   * @param appId 应用ID
   * @returns token 对象或 null
   */
  getToken(appId: string): Promise<ServiceResult<AccessToken | null>>;

  /**
   * 检查 token 是否有效（存在且未过期）
   * @param appId 应用ID
   * @returns 是否有效
   */
  isTokenValid(appId: string): Promise<ServiceResult<boolean>>;

  /**
   * 删除指定应用的 token
   * @param appId 应用ID
   * @returns 删除结果
   */
  deleteToken(appId: string): Promise<ServiceResult<boolean>>;

  /**
   * 清除所有 token 缓存
   * @returns 清除结果
   */
  clearAllTokens(): Promise<ServiceResult<boolean>>;

  /**
   * 获取 token 的剩余过期时间
   * @param appId 应用ID
   * @returns 剩余秒数，-1 表示已过期或不存在
   */
  getTokenTtl(appId: string): Promise<ServiceResult<number>>;

  /**
   * 健康检查
   * @returns 服务是否健康
   */
  healthCheck(): Promise<ServiceResult<boolean>>;
}
