// 统一模块处理示例
// 展示优化后的 withRegisterAutoDI 统一处理流程

import { withRegisterAutoDI, Controller, Executor, Get, Post } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

// 1. 控制器类 - 处理HTTP请求
@Controller()
class UserController {
  @Get('/users')
  async getUsers() {
    return { users: ['Alice', 'Bob', 'Charlie'] };
  }

  @Post('/users')
  async createUser(request: any) {
    return { success: true, user: request.body };
  }

  // 生命周期方法 - 会被自动注册到 Fastify 钩子
  onReady() {
    console.log('✅ UserController is ready');
  }

  onClose() {
    console.log('🔄 UserController is closing');
  }
}

// 2. 执行器类 - 处理异步任务
@Executor({
  name: 'userDataProcessor',
  description: '用户数据处理执行器',
  version: '1.0.0',
  tags: ['user', 'data', 'processing']
})
class UserDataProcessorExecutor {
  name = 'userDataProcessor';

  async execute(context: any) {
    console.log('🔄 Processing user data...', context);
    
    // 模拟数据处理
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      data: {
        processed: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  validateConfig(config: any) {
    return { valid: true };
  }

  // 生命周期方法
  onReady() {
    console.log('✅ UserDataProcessorExecutor is ready');
  }
}

// 3. 混合类 - 既是控制器又是执行器
@Controller()
@Executor('orderManager')
class OrderManagerHybrid {
  name = 'orderManager';

  // HTTP 路由方法
  @Get('/orders')
  async getOrders() {
    return { orders: [] };
  }

  @Post('/orders')
  async createOrder(request: any) {
    return { success: true, order: request.body };
  }

  // 任务执行方法
  async execute(context: any) {
    console.log('🔄 Processing order task...', context);
    
    return {
      success: true,
      data: {
        orderProcessed: true,
        orderId: Math.random().toString(36).substr(2, 9)
      }
    };
  }

  // 生命周期方法
  onReady() {
    console.log('✅ OrderManagerHybrid is ready');
  }

  onListen() {
    console.log('🎧 OrderManagerHybrid is listening');
  }
}

// 4. 普通服务类 - 提供业务逻辑
class NotificationService {
  sendEmail(to: string, subject: string, body: string) {
    console.log(`📧 Sending email to ${to}: ${subject}`);
    return { sent: true, messageId: Math.random().toString(36) };
  }

  sendSMS(to: string, message: string) {
    console.log(`📱 Sending SMS to ${to}: ${message}`);
    return { sent: true, messageId: Math.random().toString(36) };
  }

  // 生命周期方法
  onReady() {
    console.log('✅ NotificationService is ready');
  }
}

// 5. 业务插件定义
export const businessPlugin = withRegisterAutoDI(
  async (fastify: FastifyInstance, options: any) => {
    console.log('🚀 Business plugin is loading...');
    
    // 插件特定的业务逻辑
    fastify.log.info('Business plugin loaded with unified processing');
    
    // 可以在这里添加额外的路由或装饰器
    fastify.get('/health', async () => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });
  },
  {
    // 自动发现配置
    discovery: {
      patterns: [
        'controllers/**/*.{ts,js}',
        'executors/**/*.{ts,js}',
        'services/**/*.{ts,js}'
      ]
    },
    
    // 路由配置
    routing: {
      enabled: true,
      prefix: '/api/v1',
      validation: true
    },
    
    // 生命周期配置
    lifecycle: {
      enabled: true,
      debug: true,
      errorHandling: 'log'
    },
    
    // 服务适配器配置
    services: {
      enabled: true,
      patterns: ['adapters/**/*.{ts,js}']
    },
    
    // 调试配置
    debug: true
  }
);

// 6. 使用示例
export async function createApp() {
  const fastify = require('fastify')({ logger: true });
  
  // 注册 @fastify/awilix 插件
  await fastify.register(require('@fastify/awilix'), {
    disposeOnClose: true,
    disposeOnResponse: false
  });
  
  // 注册 @stratix/tasks 插件（如果需要执行器功能）
  // await fastify.register(require('@stratix/tasks'));
  
  // 注册业务插件
  await fastify.register(businessPlugin);
  
  return fastify;
}

// 7. 启动应用示例
export async function startApp() {
  try {
    const app = await createApp();
    
    // 启动服务器
    await app.listen({ port: 3000, host: '0.0.0.0' });
    
    console.log('🎉 Application started successfully!');
    console.log('📍 Available endpoints:');
    console.log('  - GET  /health');
    console.log('  - GET  /api/v1/users');
    console.log('  - POST /api/v1/users');
    console.log('  - GET  /api/v1/orders');
    console.log('  - POST /api/v1/orders');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// 8. 统一处理的优势说明
/*
优化后的 withRegisterAutoDI 统一处理流程的优势：

1. **单次遍历**：
   - 只需要一次遍历所有模块，避免重复扫描
   - 提高性能，减少资源消耗

2. **统一处理**：
   - 在一个主循环中处理所有模块类型
   - 生命周期方法、路由、执行器都在同一个流程中处理

3. **清晰的处理顺序**：
   - 模块发现 → 分类 → 统一处理 → 服务适配器
   - 每个步骤都有明确的职责和边界

4. **完整的统计信息**：
   - 提供详细的处理统计和性能指标
   - 便于监控和调试

5. **错误处理**：
   - 统一的错误处理机制
   - 单个模块的错误不会影响整体流程

6. **可扩展性**：
   - 易于添加新的模块类型处理逻辑
   - 预留了单个模块处理的接口

7. **调试友好**：
   - 详细的调试日志
   - 清晰的处理时间统计
*/

// 如果直接运行此文件，启动应用
if (require.main === module) {
  startApp();
}
