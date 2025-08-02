// Stratix Gateway - 主入口文件
// 基于Stratix框架的API网关服务

import { Stratix } from '@stratix/core';
import { createGatewayConfig } from '../config/gateway.config.js';

/**
 * 创建网关应用实例
 */
export async function createGateway() {
  try {
    console.log('🚀 Starting Stratix Gateway...');

    const app = await Stratix.run({
      type: 'web',
      configOptions: {
        configPath: './config/gateway.config.js',
        appDir: process.cwd()
      },
      envOptions: {
        rootDir: process.cwd(),
        strict: false
      },
      debug: process.env.NODE_ENV === 'development',
      gracefulShutdown: true,
      shutdownTimeout: 10000
    });

    // 添加自定义关闭处理器
    app.addShutdownHandler(async () => {
      console.log('🧹 Cleaning up gateway resources...');
      // 这里可以添加自定义清理逻辑
    });

    return app;
  } catch (error) {
    console.error('❌ Failed to create gateway:', error);
    throw error;
  }
}

/**
 * 启动网关服务
 */
export async function startGateway() {
  try {
    const app = await createGateway();
    
    const address = app.getAddress();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const host = typeof address === 'object' && address ? address.address : '0.0.0.0';

    console.log('✅ Stratix Gateway started successfully');
    console.log(`📍 Server listening on http://${host}:${port}`);
    console.log(`🔍 Health check: http://${host}:${port}/health`);
    console.log(`📊 Metrics: http://${host}:${port}/metrics`);
    console.log(`🔐 Admin API: http://${host}:${port}/admin`);

    // 输出路由信息
    console.log('\n📋 Available Routes:');
    console.log('  POST /auth/login - 用户登录');
    console.log('  GET  /auth/profile - 获取用户信息');
    console.log('  GET  /gateway/info - 网关信息');
    console.log('  GET  /gateway/routes - 路由配置 (需要管理员权限)');
    console.log('  GET  /health - 健康检查');
    console.log('  GET  /metrics - 监控指标');

    return app;
  } catch (error) {
    console.error('❌ Failed to start gateway:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  startGateway().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// 导出主要函数
export * from './controllers/index.js';
export * from './services/index.js';
export * from './types/index.js';
export { createGatewayConfig };
