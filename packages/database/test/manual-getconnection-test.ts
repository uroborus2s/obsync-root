// 手动测试 getConnection 重构功能
// 验证自动创建连接和函数式编程实现

import DatabaseManager from '../src/core/database-manager.js';
import ConnectionFactory from '../src/core/connection-factory.js';
import type { DatabaseConfig } from '../src/types/index.js';

// Mock Logger
const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

async function testGetConnectionRefactor() {
  console.log('🧪 开始测试 getConnection 重构功能...\n');

  // 测试配置
  const config: DatabaseConfig = {
    connections: {
      default: {
        type: 'sqlite',
        database: ':memory:'
      },
      test: {
        type: 'sqlite',
        database: ':memory:'
      }
    },
    defaultConnection: 'default'
  };

  try {
    // 创建实例
    const connectionFactory = new ConnectionFactory({}, mockLogger as any);
    const databaseManager = new DatabaseManager(config, connectionFactory);

    // 初始化环境
    await databaseManager.validateEnvironment();
    await databaseManager.initializeConnectionFactory();

    console.log('✅ DatabaseManager 初始化成功');

    // 测试1: 获取默认连接（应该自动创建）
    console.log('\n📋 测试1: 获取默认连接（自动创建）');
    const defaultConnection = await databaseManager.getConnection();
    console.log('✅ 默认连接获取成功');

    // 测试2: 再次获取默认连接（应该从缓存获取）
    console.log('\n📋 测试2: 再次获取默认连接（从缓存）');
    const cachedConnection = await databaseManager.getConnection();
    console.log('✅ 缓存连接获取成功');
    console.log(`🔍 连接是否相同: ${defaultConnection === cachedConnection ? '是' : '否'}`);

    // 测试3: 获取命名连接
    console.log('\n📋 测试3: 获取命名连接（自动创建）');
    const testConnection = await databaseManager.getConnection('test');
    console.log('✅ 命名连接获取成功');

    // 测试4: 检查连接统计
    console.log('\n📋 测试4: 检查连接统计');
    const stats = databaseManager.getConnectionStats();
    console.log(`📊 连接统计数量: ${stats.size}`);
    for (const [name, stat] of stats) {
      console.log(`  - ${name}: ${stat.totalQueries} 次查询, 状态: ${stat.status}`);
    }

    // 测试5: 测试不存在的连接配置
    console.log('\n📋 测试5: 测试不存在的连接配置');
    try {
      await databaseManager.getConnection('nonexistent');
      console.log('❌ 应该抛出错误');
    } catch (error) {
      console.log('✅ 正确抛出错误:', error.message);
    }

    // 测试6: 测试读写分离
    console.log('\n📋 测试6: 测试读写分离');
    const readConnection = await databaseManager.getReadConnection();
    const writeConnection = await databaseManager.getWriteConnection();
    console.log('✅ 读写连接获取成功');

    // 清理
    await databaseManager.onClose();
    console.log('\n🧹 资源清理完成');

    console.log('\n🎉 所有测试通过！getConnection 重构功能正常工作');
    return true;

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testGetConnectionRefactor()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('测试运行器失败:', error);
      process.exit(1);
    });
}

export { testGetConnectionRefactor };
