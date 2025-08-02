// @stratix/database 简单集成测试
// 验证数据库连接和基本功能

import { 
  createConnection, 
  testConnection, 
  DriverChecker,
  isDatabaseTypeAvailable 
} from '../src/index.js';
import type { ConnectionConfig } from '../src/types/index.js';

/**
 * SQLite 基本测试
 */
async function testSQLiteConnection() {
  console.log('Testing SQLite connection...');

  const config: ConnectionConfig = {
    type: 'sqlite',
    database: ':memory:'
  };

  try {
    // 测试连接
    const testResult = await testConnection(config);
    console.log('SQLite test result:', testResult.success ? '✅ Pass' : '❌ Fail');

    if (testResult.success) {
      // 创建连接
      const connectionResult = await createConnection(config);
      
      if (connectionResult.success) {
        const db = connectionResult.data;
        
        // 简单查询测试
        const result = await db.executeQuery(db.sql`SELECT 1 as test`.compile());
        console.log('SQLite query test:', result.rows.length > 0 ? '✅ Pass' : '❌ Fail');
        
        await db.destroy();
        return true;
      }
    }
  } catch (error) {
    console.error('SQLite test failed:', error);
  }
  
  return false;
}

/**
 * 驱动检查测试
 */
function testDriverChecker() {
  console.log('\nTesting driver checker...');

  // 检查SQLite驱动
  const sqliteAvailable = isDatabaseTypeAvailable('sqlite');
  console.log('SQLite available:', sqliteAvailable ? '✅ Yes' : '❌ No');

  // 生成报告
  const report = DriverChecker.generateReport();
  console.log('\nDriver Report:');
  console.log(report);

  return sqliteAvailable;
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('🧪 Running Database Integration Tests...\n');

  let passCount = 0;
  let totalTests = 0;

  // 测试1: 驱动检查
  totalTests++;
  if (testDriverChecker()) {
    passCount++;
  }

  // 测试2: SQLite连接
  totalTests++;
  if (await testSQLiteConnection()) {
    passCount++;
  }

  // 结果报告
  console.log(`\n📊 Test Results: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}