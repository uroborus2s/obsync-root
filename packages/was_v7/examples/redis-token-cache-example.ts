/**
 * WPS V7 插件 Redis Token 缓存示例
 * 展示如何配置和使用 Redis 缓存 access token
 */

import { Stratix, type StratixConfig } from '@stratix/core';
import wasV7Plugin from '../src/index.js';
import redisPlugin from '@stratix/redis';

// ===== 1. 配置 Redis 和 WPS V7 插件 =====

export function createConfig(): StratixConfig {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },

    plugins: [
      // 1. 先注册 Redis 插件
      {
        plugin: redisPlugin,
        options: {
          single: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
          },
          poolSize: 10,
          retryAttempts: 3,
          retryDelay: 1000
        }
      },
      // 2. 注册 WPS V7 插件
      {
        plugin: wasV7Plugin,
        options: {
          // 必需参数
          appId: process.env.WPS_APP_ID || 'your-app-id',
          appSecret: process.env.WPS_APP_SECRET || 'your-app-secret',
          
          // 可选参数
          baseUrl: 'https://openapi.wps.cn',
          timeout: 60000,
          retryTimes: 3,
          debug: process.env.NODE_ENV === 'development',
          
          // Token 缓存配置
          tokenCache: {
            keyPrefix: 'wps:token:',
            defaultTtl: 7200, // 2小时
            earlyExpireSeconds: 900, // 15分钟
            enableFallback: true // 启用内存降级
          }
        }
      }
    ],

    logger: {
      level: 'info',
      pretty: true
    }
  } as any;
}

// ===== 2. 演示 Token 缓存功能 =====

async function demonstrateTokenCache() {
  console.log('🚀 Starting WPS V7 Redis Token Cache Demo...');

  let app: any;

  try {
    // 启动应用
    app = await Stratix.run(createConfig());
    console.log('✅ Application started successfully');

    // 获取 WPS 用户适配器
    const userAdapter = app.diContainer.resolve('userAdapter');
    console.log('📡 User adapter resolved');

    // 第一次调用 - 会获取新的 token 并缓存到 Redis
    console.log('\n📋 First API call - will fetch and cache new token...');
    const users1 = await userAdapter.getUserList({ page_size: 10 });
    console.log(`✅ First call successful, got ${users1.data?.items?.length || 0} users`);

    // 第二次调用 - 会使用 Redis 缓存的 token
    console.log('\n📋 Second API call - will use cached token...');
    const users2 = await userAdapter.getUserList({ page_size: 5 });
    console.log(`✅ Second call successful, got ${users2.data?.items?.length || 0} users`);

    // 获取 token 缓存服务来演示缓存操作
    const tokenCacheService = app.diContainer.resolve('tokenCacheService');
    
    // 检查 token 有效性
    const isValid = await tokenCacheService.isTokenValid(process.env.WPS_APP_ID || 'your-app-id');
    console.log(`\n🔍 Token validity check: ${isValid.data ? 'Valid' : 'Invalid'}`);

    // 获取 token TTL
    const ttlResult = await tokenCacheService.getTokenTtl(process.env.WPS_APP_ID || 'your-app-id');
    if (ttlResult.success && ttlResult.data > 0) {
      console.log(`⏰ Token TTL: ${ttlResult.data} seconds`);
    }

    // 健康检查
    const healthResult = await tokenCacheService.healthCheck();
    console.log(`💚 Token cache service health: ${healthResult.data ? 'Healthy' : 'Unhealthy'}`);

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    if (app) {
      await app.close();
      console.log('🔄 Application closed');
    }
  }
}

// ===== 3. 演示降级功能 =====

async function demonstrateFallback() {
  console.log('\n🔄 Demonstrating fallback to memory storage...');

  // 配置禁用 Redis 的版本
  const configWithoutRedis: StratixConfig = {
    ...createConfig(),
    plugins: [
      // 只注册 WPS V7 插件，不注册 Redis
      {
        plugin: wasV7Plugin,
        options: {
          appId: process.env.WPS_APP_ID || 'your-app-id',
          appSecret: process.env.WPS_APP_SECRET || 'your-app-secret',
          tokenCache: {
            enableFallback: true // 启用内存降级
          }
        }
      }
    ]
  } as any;

  let app: any;

  try {
    app = await Stratix.run(configWithoutRedis);
    console.log('✅ Application started without Redis');

    const userAdapter = app.diContainer.resolve('userAdapter');
    
    // 这次调用会使用内存存储作为降级方案
    console.log('📋 API call with memory fallback...');
    const users = await userAdapter.getUserList({ page_size: 3 });
    console.log(`✅ Fallback call successful, got ${users.data?.items?.length || 0} users`);

  } catch (error) {
    console.error('❌ Fallback demo failed:', error);
  } finally {
    if (app) {
      await app.close();
      console.log('🔄 Application closed');
    }
  }
}

// ===== 4. 运行演示 =====

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await demonstrateTokenCache();
      await demonstrateFallback();
    } catch (error) {
      console.error('❌ Demo execution failed:', error);
      process.exit(1);
    }
  })();
}

export { demonstrateTokenCache, demonstrateFallback };
