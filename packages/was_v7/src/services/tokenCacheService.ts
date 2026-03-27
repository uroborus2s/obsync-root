/**
 * Token 缓存服务实现
 * 使用 Redis 存储 WPS API 访问令牌，支持降级到内存存储
 */

import { RESOLVER, type Logger } from '@stratix/core';
import type { RedisAdapter } from '@stratix/redis';
import type { AccessToken } from '../types/index.js';
import type {
  ITokenCacheService,
  ServiceResult,
  TokenCacheConfig
} from './interfaces/ITokenCacheService.js';

/**
 * Token 缓存服务
 * 优先使用 Redis 存储，Redis 不可用时降级到内存存储
 */
export class TokenCacheService implements ITokenCacheService {
  static [RESOLVER] = {};

  private readonly config: TokenCacheConfig;
  private readonly fallbackStorage = new Map<
    string,
    { token: AccessToken; expireTime: number }
  >();
  private redisAvailable = true;

  constructor(
    private readonly redisClient: RedisAdapter,
    private readonly logger: Logger
  ) {
    this.config = {
      keyPrefix: 'wpsV7:token:',
      defaultTtl: 7200, // 2小时
      earlyExpireSeconds: 900, // 15分钟
      enableFallback: true
    };

    this.logger.info('TokenCacheService initialized', {
      keyPrefix: this.config.keyPrefix,
      defaultTtl: this.config.defaultTtl,
      earlyExpireSeconds: this.config.earlyExpireSeconds,
      enableFallback: this.config.enableFallback
    });
  }

  /**
   * 生成 Redis 键
   */
  private generateKey(appId: string): string {
    return `${this.config.keyPrefix}${appId}`;
  }

  /**
   * 检查 Redis 是否可用
   */
  private async checkRedisAvailability(): Promise<boolean> {
    try {
      await this.redisClient.ping();
      if (!this.redisAvailable) {
        this.logger.info('Redis connection restored');
        this.redisAvailable = true;
      }
      return true;
    } catch (error) {
      if (this.redisAvailable) {
        this.logger.warn(
          'Redis connection lost, falling back to memory storage',
          { error }
        );
        this.redisAvailable = false;
      }
      return false;
    }
  }

  /**
   * 存储 token 到缓存
   */
  async setToken(
    appId: string,
    token: AccessToken
  ): Promise<ServiceResult<boolean>> {
    try {
      const key = this.generateKey(appId);
      const tokenData = JSON.stringify(token);
      const ttl = token.expires_in || this.config.defaultTtl!;

      // 尝试使用 Redis
      if (await this.checkRedisAvailability()) {
        try {
          await this.redisClient.set(key, tokenData, ttl);
          this.logger.debug('Token stored in Redis', { appId, ttl });
          return { success: true, data: true };
        } catch (error) {
          this.logger.error('Failed to store token in Redis', { appId, error });
          this.redisAvailable = false;
        }
      }

      // 降级到内存存储
      if (this.config.enableFallback) {
        const expireTime = Date.now() + ttl * 1000;
        this.fallbackStorage.set(appId, { token, expireTime });
        this.logger.debug('Token stored in fallback memory storage', {
          appId,
          ttl
        });
        return { success: true, data: true };
      }

      return {
        success: false,
        error: 'Redis unavailable and fallback disabled',
        data: false
      };
    } catch (error) {
      this.logger.error('Error storing token', { appId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: false
      };
    }
  }

  /**
   * 从缓存获取 token
   */
  async getToken(appId: string): Promise<ServiceResult<AccessToken | null>> {
    try {
      const key = this.generateKey(appId);

      // 尝试从 Redis 获取
      if (await this.checkRedisAvailability()) {
        try {
          const tokenData = await this.redisClient.get(key);
          if (tokenData) {
            const token = JSON.parse(tokenData) as AccessToken;
            this.logger.debug('Token retrieved from Redis', { appId });
            return { success: true, data: token };
          }
        } catch (error) {
          this.logger.error('Failed to get token from Redis', { appId, error });
          this.redisAvailable = false;
        }
      }

      // 从内存存储获取
      if (this.config.enableFallback) {
        const cached = this.fallbackStorage.get(appId);
        if (cached) {
          // 检查是否过期
          if (
            Date.now() <
            cached.expireTime - this.config.earlyExpireSeconds! * 1000
          ) {
            this.logger.debug('Token retrieved from fallback memory storage', {
              appId
            });
            return { success: true, data: cached.token };
          } else {
            // 已过期，删除
            this.fallbackStorage.delete(appId);
            this.logger.debug('Expired token removed from fallback storage', {
              appId
            });
          }
        }
      }

      return { success: true, data: null };
    } catch (error) {
      this.logger.error('Error getting token', { appId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  /**
   * 检查 token 是否有效
   */
  async isTokenValid(appId: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.getToken(appId);
      if (!result.success) {
        return { success: false, error: result.error, data: false };
      }

      const isValid = result.data !== null;
      this.logger.debug('Token validity checked', { appId, isValid });
      return { success: true, data: isValid };
    } catch (error) {
      this.logger.error('Error checking token validity', { appId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: false
      };
    }
  }

  /**
   * 删除指定应用的 token
   */
  async deleteToken(appId: string): Promise<ServiceResult<boolean>> {
    try {
      const key = this.generateKey(appId);
      let deleted = false;

      // 从 Redis 删除
      if (await this.checkRedisAvailability()) {
        try {
          const result = await this.redisClient.del(key);
          deleted = result > 0;
          this.logger.debug('Token deleted from Redis', { appId, deleted });
        } catch (error) {
          this.logger.error('Failed to delete token from Redis', {
            appId,
            error
          });
          this.redisAvailable = false;
        }
      }

      // 从内存存储删除
      if (this.config.enableFallback) {
        const memoryDeleted = this.fallbackStorage.delete(appId);
        deleted = deleted || memoryDeleted;
        if (memoryDeleted) {
          this.logger.debug('Token deleted from fallback memory storage', {
            appId
          });
        }
      }

      return { success: true, data: deleted };
    } catch (error) {
      this.logger.error('Error deleting token', { appId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: false
      };
    }
  }

  /**
   * 清除所有 token 缓存
   */
  async clearAllTokens(): Promise<ServiceResult<boolean>> {
    try {
      let cleared = false;

      // 清除 Redis 中的 tokens
      if (await this.checkRedisAvailability()) {
        try {
          // 使用模式匹配删除所有相关键
          const pattern = `${this.config.keyPrefix}*`;
          const keys = await this.redisClient.keys(pattern);
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
            cleared = true;
            this.logger.info('All tokens cleared from Redis', {
              count: keys.length
            });
          }
        } catch (error) {
          this.logger.error('Failed to clear tokens from Redis', { error });
          this.redisAvailable = false;
        }
      }

      // 清除内存存储
      if (this.config.enableFallback) {
        const memoryCount = this.fallbackStorage.size;
        this.fallbackStorage.clear();
        if (memoryCount > 0) {
          cleared = true;
          this.logger.info('All tokens cleared from fallback memory storage', {
            count: memoryCount
          });
        }
      }

      return { success: true, data: cleared };
    } catch (error) {
      this.logger.error('Error clearing all tokens', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: false
      };
    }
  }

  /**
   * 获取 token 的剩余过期时间
   */
  async getTokenTtl(appId: string): Promise<ServiceResult<number>> {
    try {
      const key = this.generateKey(appId);

      // 尝试从 Redis 获取 TTL
      if (await this.checkRedisAvailability()) {
        try {
          const ttl = await this.redisClient.ttl(key);
          if (ttl > 0) {
            this.logger.debug('Token TTL retrieved from Redis', { appId, ttl });
            return { success: true, data: ttl };
          }
        } catch (error) {
          this.logger.error('Failed to get token TTL from Redis', {
            appId,
            error
          });
          this.redisAvailable = false;
        }
      }

      // 从内存存储计算 TTL
      if (this.config.enableFallback) {
        const cached = this.fallbackStorage.get(appId);
        if (cached) {
          const remainingMs = cached.expireTime - Date.now();
          const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
          this.logger.debug('Token TTL calculated from fallback storage', {
            appId,
            ttl: remainingSeconds
          });
          return { success: true, data: remainingSeconds };
        }
      }

      return { success: true, data: -1 };
    } catch (error) {
      this.logger.error('Error getting token TTL', { appId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: -1
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ServiceResult<boolean>> {
    try {
      const redisHealthy = await this.checkRedisAvailability();
      const fallbackEnabled = this.config.enableFallback;

      // 如果 Redis 健康或者启用了降级，则认为服务健康
      const isHealthy = redisHealthy || fallbackEnabled;

      this.logger.debug('TokenCacheService health check', {
        redisHealthy,
        fallbackEnabled,
        isHealthy
      });

      return { success: true, data: isHealthy };
    } catch (error) {
      this.logger.error('Error during health check', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: false
      };
    }
  }
}
