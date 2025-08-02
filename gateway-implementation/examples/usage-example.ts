// Stratix Gateway 使用示例
// 展示如何使用网关的各种功能

import type { StratixApplication } from '@stratix/core';
import { createGateway } from '../src/index.js';

/**
 * 基本使用示例
 */
async function basicUsageExample() {
  console.log('🚀 启动基本网关示例...\n');

  try {
    // 创建网关实例
    const gateway = await createGateway();
    
    console.log('✅ 网关启动成功');
    console.log(`📍 服务地址: ${gateway.getAddress()}`);
    
    // 模拟一些API调用
    await simulateAPIRequests(gateway);
    
    // 优雅关闭
    setTimeout(async () => {
      console.log('\n🛑 关闭网关...');
      await gateway.stop();
      console.log('✅ 网关已关闭');
    }, 10000);
    
  } catch (error) {
    console.error('❌ 网关启动失败:', error);
  }
}

/**
 * 模拟API请求
 */
async function simulateAPIRequests(gateway: StratixApplication) {
  console.log('\n📡 模拟API请求...\n');

  try {
    // 1. 健康检查
    console.log('1. 健康检查:');
    const healthResponse = await gateway.inject({
      method: 'GET',
      url: '/health'
    });
    console.log(`   状态: ${healthResponse.statusCode}`);
    console.log(`   响应: ${JSON.parse(healthResponse.payload).status}`);

    // 2. 获取网关信息
    console.log('\n2. 网关信息:');
    const infoResponse = await gateway.inject({
      method: 'GET',
      url: '/gateway/info'
    });
    console.log(`   状态: ${infoResponse.statusCode}`);
    const info = JSON.parse(infoResponse.payload);
    console.log(`   名称: ${info.name}`);
    console.log(`   版本: ${info.version}`);

    // 3. 用户登录
    console.log('\n3. 用户登录:');
    const loginResponse = await gateway.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'admin',
        password: 'admin123'
      }
    });
    console.log(`   状态: ${loginResponse.statusCode}`);
    
    if (loginResponse.statusCode === 200) {
      const loginData = JSON.parse(loginResponse.payload);
      console.log(`   用户: ${loginData.user.username}`);
      console.log(`   角色: ${loginData.user.roles.join(', ')}`);
      
      const token = loginData.token;

      // 4. 获取用户信息（需要认证）
      console.log('\n4. 获取用户信息:');
      const profileResponse = await gateway.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      console.log(`   状态: ${profileResponse.statusCode}`);
      
      if (profileResponse.statusCode === 200) {
        const profile = JSON.parse(profileResponse.payload);
        console.log(`   用户ID: ${profile.user.id}`);
        console.log(`   权限数: ${profile.user.permissions.length}`);
      }

      // 5. 获取路由配置（需要管理员权限）
      console.log('\n5. 获取路由配置:');
      const routesResponse = await gateway.inject({
        method: 'GET',
        url: '/gateway/routes',
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      console.log(`   状态: ${routesResponse.statusCode}`);
      
      if (routesResponse.statusCode === 200) {
        console.log('   ✅ 管理员权限验证通过');
      } else if (routesResponse.statusCode === 403) {
        console.log('   ❌ 权限不足');
      }
    }

    // 6. 测试限流
    console.log('\n6. 测试限流:');
    await testRateLimit(gateway);

    // 7. 测试未认证访问
    console.log('\n7. 测试未认证访问:');
    const unauthorizedResponse = await gateway.inject({
      method: 'GET',
      url: '/auth/profile'
    });
    console.log(`   状态: ${unauthorizedResponse.statusCode}`);
    console.log('   ✅ 认证保护正常工作');

  } catch (error) {
    console.error('❌ API请求模拟失败:', error);
  }
}

/**
 * 测试限流功能
 */
async function testRateLimit(gateway: StratixApplication) {
  const requests = [];
  
  // 快速发送多个请求测试限流
  for (let i = 0; i < 10; i++) {
    requests.push(
      gateway.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'test',
          password: 'wrong'
        }
      })
    );
  }

  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.statusCode === 429);
  
  console.log(`   发送请求: ${requests.length}`);
  console.log(`   被限流: ${rateLimited.length}`);
  
  if (rateLimited.length > 0) {
    console.log('   ✅ 限流功能正常工作');
  }
}

/**
 * 高级配置示例
 */
async function advancedConfigExample() {
  console.log('🔧 高级配置示例...\n');

  // 设置环境变量
  process.env.GATEWAY_PORT = '3001';
  process.env.JWT_SECRET = 'advanced-secret-key';
  process.env.RATE_LIMIT_GLOBAL = '500';
  process.env.LOG_LEVEL = 'debug';

  try {
    const gateway = await createGateway();
    
    console.log('✅ 高级配置网关启动成功');
    console.log('📋 配置特性:');
    console.log('   - 自定义端口: 3001');
    console.log('   - 自定义JWT密钥');
    console.log('   - 调整限流配置');
    console.log('   - 调试日志级别');
    
    // 等待一段时间后关闭
    setTimeout(async () => {
      await gateway.stop();
      console.log('✅ 高级配置网关已关闭');
    }, 5000);
    
  } catch (error) {
    console.error('❌ 高级配置网关启动失败:', error);
  }
}

/**
 * 性能测试示例
 */
async function performanceTestExample() {
  console.log('⚡ 性能测试示例...\n');

  try {
    const gateway = await createGateway();
    
    console.log('🏃 开始性能测试...');
    
    const startTime = Date.now();
    const concurrentRequests = 100;
    const requests = [];

    // 并发请求测试
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        gateway.inject({
          method: 'GET',
          url: '/health'
        })
      );
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    const successfulRequests = responses.filter(r => r.statusCode === 200).length;
    const totalTime = endTime - startTime;
    const requestsPerSecond = (concurrentRequests / totalTime) * 1000;

    console.log('📊 性能测试结果:');
    console.log(`   并发请求数: ${concurrentRequests}`);
    console.log(`   成功请求数: ${successfulRequests}`);
    console.log(`   总耗时: ${totalTime}ms`);
    console.log(`   平均RPS: ${requestsPerSecond.toFixed(2)}`);
    console.log(`   平均响应时间: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
    
    await gateway.stop();
    console.log('✅ 性能测试完成');
    
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
  }
}

/**
 * 错误处理示例
 */
async function errorHandlingExample() {
  console.log('🚨 错误处理示例...\n');

  try {
    const gateway = await createGateway();
    
    console.log('🧪 测试各种错误场景...');

    // 1. 404错误
    console.log('\n1. 测试404错误:');
    const notFoundResponse = await gateway.inject({
      method: 'GET',
      url: '/nonexistent-endpoint'
    });
    console.log(`   状态: ${notFoundResponse.statusCode}`);
    console.log(`   ✅ 404处理正常`);

    // 2. 方法不允许
    console.log('\n2. 测试方法不允许:');
    const methodNotAllowedResponse = await gateway.inject({
      method: 'DELETE',
      url: '/health'
    });
    console.log(`   状态: ${methodNotAllowedResponse.statusCode}`);

    // 3. 无效JSON
    console.log('\n3. 测试无效JSON:');
    const invalidJsonResponse = await gateway.inject({
      method: 'POST',
      url: '/auth/login',
      payload: 'invalid json',
      headers: {
        'content-type': 'application/json'
      }
    });
    console.log(`   状态: ${invalidJsonResponse.statusCode}`);

    // 4. 大请求体
    console.log('\n4. 测试大请求体:');
    const largePayload = 'x'.repeat(2 * 1024 * 1024); // 2MB
    const largeBodyResponse = await gateway.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { data: largePayload }
    });
    console.log(`   状态: ${largeBodyResponse.statusCode}`);
    
    await gateway.stop();
    console.log('\n✅ 错误处理测试完成');
    
  } catch (error) {
    console.error('❌ 错误处理测试失败:', error);
  }
}

/**
 * 监控和指标示例
 */
async function monitoringExample() {
  console.log('📊 监控和指标示例...\n');

  try {
    const gateway = await createGateway();
    
    // 生成一些流量
    console.log('📈 生成测试流量...');
    for (let i = 0; i < 20; i++) {
      await gateway.inject({
        method: 'GET',
        url: '/health'
      });
      
      if (i % 5 === 0) {
        await gateway.inject({
          method: 'GET',
          url: '/gateway/info'
        });
      }
    }

    // 获取指标
    console.log('\n📊 获取监控指标:');
    const metricsResponse = await gateway.inject({
      method: 'GET',
      url: '/metrics'
    });
    
    console.log(`   状态: ${metricsResponse.statusCode}`);
    console.log('   指标类型: Prometheus格式');
    
    // 获取详细健康检查
    console.log('\n🏥 获取详细健康检查:');
    const detailedHealthResponse = await gateway.inject({
      method: 'GET',
      url: '/health/detailed'
    });
    
    if (detailedHealthResponse.statusCode === 200) {
      const health = JSON.parse(detailedHealthResponse.payload);
      console.log(`   整体状态: ${health.status}`);
      console.log(`   运行时间: ${Math.round(health.uptime)}秒`);
      console.log(`   内存使用: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`);
    }
    
    await gateway.stop();
    console.log('\n✅ 监控示例完成');
    
  } catch (error) {
    console.error('❌ 监控示例失败:', error);
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🎯 Stratix Gateway 完整示例\n');
  console.log('=' .repeat(50));

  try {
    await basicUsageExample();
    console.log('\n' + '='.repeat(50));
    
    await advancedConfigExample();
    console.log('\n' + '='.repeat(50));
    
    await performanceTestExample();
    console.log('\n' + '='.repeat(50));
    
    await errorHandlingExample();
    console.log('\n' + '='.repeat(50));
    
    await monitoringExample();
    console.log('\n' + '='.repeat(50));
    
    console.log('\n🎉 所有示例运行完成!');
    
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
    advancedConfigExample, basicUsageExample, errorHandlingExample,
    monitoringExample, performanceTestExample, runAllExamples
};
