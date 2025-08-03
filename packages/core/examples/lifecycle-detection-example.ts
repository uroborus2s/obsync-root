// 生命周期方法检测示例
// 展示优化后的 discoverAndClassifyModules 函数的生命周期方法检测功能

import { withRegisterAutoDI, Controller, Executor, Get } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

// 1. 带有生命周期方法的控制器
@Controller()
class UserController {
  @Get('/users')
  async getUsers() {
    return { users: ['Alice', 'Bob'] };
  }

  // 生命周期方法 - 会被自动检测和注册
  onReady() {
    console.log('✅ UserController is ready');
  }

  onClose() {
    console.log('🔄 UserController is closing');
  }
}

// 2. 带有生命周期方法的执行器
@Executor('dataProcessor')
class DataProcessorExecutor {
  name = 'dataProcessor';

  async execute(context: any) {
    console.log('🔄 Processing data...', context);
    return { success: true, processed: true };
  }

  // 生命周期方法
  onReady() {
    console.log('✅ DataProcessorExecutor is ready');
  }

  onListen() {
    console.log('🎧 DataProcessorExecutor is listening');
  }

  onClose() {
    console.log('🔄 DataProcessorExecutor is closing');
  }
}

// 3. 带有多个生命周期方法的服务
class NotificationService {
  sendNotification(message: string) {
    console.log(`📧 Sending notification: ${message}`);
    return { sent: true };
  }

  // 多个生命周期方法
  onReady() {
    console.log('✅ NotificationService is ready');
  }

  onListen() {
    console.log('🎧 NotificationService is listening');
  }

  onClose() {
    console.log('🔄 NotificationService is closing');
  }

  preClose() {
    console.log('🔄 NotificationService is preparing to close');
  }

  onRoute(route: any) {
    console.log('🛣️ NotificationService detected new route:', route.url);
  }
}

// 4. 没有生命周期方法的普通服务
class UtilityService {
  formatDate(date: Date) {
    return date.toISOString();
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // 注意：这个类没有任何生命周期方法
}

// 5. 混合类 - 既是控制器又有生命周期方法
@Controller()
class OrderController {
  @Get('/orders')
  async getOrders() {
    return { orders: [] };
  }

  // 生命周期方法
  onReady() {
    console.log('✅ OrderController is ready');
  }

  onRegister() {
    console.log('📝 OrderController has been registered');
  }
}

// 6. 业务插件定义
export const lifecycleDetectionPlugin = withRegisterAutoDI(
  async (fastify: FastifyInstance, options: any) => {
    console.log('🚀 Lifecycle detection plugin is loading...');
    
    // 插件逻辑
    fastify.log.info('Plugin loaded with enhanced lifecycle detection');
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
    
    // 生命周期配置 - 启用增强的生命周期检测
    lifecycle: {
      enabled: true,
      debug: true,
      errorHandling: 'log'
    },
    
    // 路由配置
    routing: {
      enabled: true,
      prefix: '/api'
    },
    
    // 调试配置
    debug: true
  }
);

// 7. 使用示例
export async function demonstrateLifecycleDetection() {
  const fastify = require('fastify')({ logger: true });
  
  // 注册 @fastify/awilix 插件
  await fastify.register(require('@fastify/awilix'), {
    disposeOnClose: true,
    disposeOnResponse: false
  });
  
  // 手动注册服务到容器（模拟自动发现）
  fastify.diContainer.register({
    userController: require('awilix').asClass(UserController),
    dataProcessorExecutor: require('awilix').asClass(DataProcessorExecutor),
    notificationService: require('awilix').asClass(NotificationService),
    utilityService: require('awilix').asClass(UtilityService),
    orderController: require('awilix').asClass(OrderController)
  });
  
  // 注册业务插件
  await fastify.register(lifecycleDetectionPlugin);
  
  console.log('🎉 Lifecycle detection demonstration completed!');
  console.log('📊 Expected detection results:');
  console.log('  - UserController: onReady, onClose');
  console.log('  - DataProcessorExecutor: onReady, onListen, onClose');
  console.log('  - NotificationService: onReady, onListen, onClose, preClose, onRoute');
  console.log('  - UtilityService: (no lifecycle methods)');
  console.log('  - OrderController: onReady, onRegister');
  
  return fastify;
}

// 8. 生命周期方法检测的优势说明
/*
优化后的生命周期方法检测的优势：

1. **统一检测**：
   - 在模块发现阶段就检测生命周期方法
   - 避免在生命周期处理阶段重复扫描

2. **完整分类**：
   - 将生命周期模块作为独立的分类
   - 提供详细的生命周期方法列表

3. **性能优化**：
   - 单次遍历完成所有检测
   - 减少容器访问次数

4. **精确统计**：
   - 准确统计有生命周期方法的模块数量
   - 详细记录每个模块的生命周期方法

5. **调试友好**：
   - 详细的调试日志
   - 清晰的模块分类信息

6. **支持的生命周期方法**：
   - onReady: 服务准备就绪时调用
   - onListen: 服务开始监听时调用
   - onClose: 服务关闭时调用
   - preClose: 服务关闭前调用
   - onRoute: 新路由注册时调用
   - onRegister: 插件注册时调用

7. **自动注册**：
   - 检测到的生命周期方法会自动注册到 Fastify 钩子
   - 无需手动配置或注册

8. **错误处理**：
   - 单个模块的生命周期方法错误不会影响其他模块
   - 提供详细的错误信息和统计
*/

// 如果直接运行此文件，启动演示
if (require.main === module) {
  demonstrateLifecycleDetection()
    .then(app => {
      console.log('✅ Demonstration setup completed');
      // 可以在这里启动服务器进行测试
      // return app.listen({ port: 3000 });
    })
    .catch(error => {
      console.error('❌ Demonstration failed:', error);
      process.exit(1);
    });
}
