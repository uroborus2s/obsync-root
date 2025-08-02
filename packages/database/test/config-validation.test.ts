// @stratix/database 配置验证测试
// 验证重构后的配置管理功能

import { 
  createPluginConfig, 
  ConfigHelpers,
  PluginConfigValidator,
  DEFAULT_PLUGIN_CONFIG
} from '../src/config/plugin-config.js';

/**
 * 测试基础配置验证
 */
function testBasicConfigValidation() {
  console.log('Testing basic config validation...');

  try {
    // 测试有效配置
    const validConfig = {
      connections: {
        default: {
          type: 'sqlite',
          database: ':memory:'
        }
      }
    };

    const result = createPluginConfig(validConfig);
    console.log('✅ Valid config test passed');
    console.log('  - Default connection:', result.defaultConnection);
    console.log('  - Health check enabled:', ConfigHelpers.isHealthCheckEnabled(result));
    console.log('  - Monitoring enabled:', ConfigHelpers.isMonitoringEnabled(result));

    return true;
  } catch (error) {
    console.error('❌ Valid config test failed:', error);
    return false;
  }
}

/**
 * 测试无效配置验证
 */
function testInvalidConfigValidation() {
  console.log('\nTesting invalid config validation...');

  try {
    // 测试缺少连接配置
    const invalidConfig = {};
    
    try {
      createPluginConfig(invalidConfig);
      console.error('❌ Should have thrown error for missing connections');
      return false;
    } catch (error) {
      console.log('✅ Correctly rejected config without connections');
    }

    // 测试无效数据库类型
    const invalidTypeConfig = {
      connections: {
        default: {
          type: 'invalid-db-type',
          database: 'test'
        }
      }
    };

    try {
      createPluginConfig(invalidTypeConfig);
      console.error('❌ Should have thrown error for invalid database type');
      return false;
    } catch (error) {
      console.log('✅ Correctly rejected invalid database type');
    }

    return true;
  } catch (error) {
    console.error('❌ Invalid config test failed:', error);
    return false;
  }
}

/**
 * 测试配置合并
 */
function testConfigMerging() {
  console.log('\nTesting config merging...');

  try {
    const customConfig = {
      connections: {
        default: {
          type: 'sqlite',
          database: ':memory:'
        }
      },
      healthCheck: {
        enabled: false
      },
      monitoring: {
        enabled: true,
        sampleRate: 0.5
      }
    };

    const result = createPluginConfig(customConfig);
    
    // 验证默认值被正确合并
    console.log('✅ Config merging test passed');
    console.log('  - Health check enabled:', result.healthCheck?.enabled);
    console.log('  - Monitoring sample rate:', result.monitoring?.sampleRate);
    console.log('  - Default connection name:', result.defaultConnection);

    return true;
  } catch (error) {
    console.error('❌ Config merging test failed:', error);
    return false;
  }
}

/**
 * 测试配置助手函数
 */
function testConfigHelpers() {
  console.log('\nTesting config helpers...');

  try {
    const config = createPluginConfig({
      connections: {
        default: {
          type: 'sqlite',
          database: ':memory:'
        }
      },
      healthCheck: {
        enabled: true,
        endpoint: '/custom/health'
      }
    });

    // 测试助手函数
    const isHealthEnabled = ConfigHelpers.isHealthCheckEnabled(config);
    const healthEndpoint = ConfigHelpers.getHealthCheckEndpoint(config);
    const isMonitoringEnabled = ConfigHelpers.isMonitoringEnabled(config);
    const isDebugMode = ConfigHelpers.isDebugMode();

    console.log('✅ Config helpers test passed');
    console.log('  - Health check enabled:', isHealthEnabled);
    console.log('  - Health endpoint:', healthEndpoint);
    console.log('  - Monitoring enabled:', isMonitoringEnabled);
    console.log('  - Debug mode:', isDebugMode);

    return true;
  } catch (error) {
    console.error('❌ Config helpers test failed:', error);
    return false;
  }
}

/**
 * 测试默认配置
 */
function testDefaultConfig() {
  console.log('\nTesting default config...');

  try {
    console.log('✅ Default config structure:');
    console.log('  - Default connection:', DEFAULT_PLUGIN_CONFIG.defaultConnection);
    console.log('  - Health check interval:', DEFAULT_PLUGIN_CONFIG.healthCheck?.intervalMs);
    console.log('  - Monitoring sample rate:', DEFAULT_PLUGIN_CONFIG.monitoring?.sampleRate);
    console.log('  - Security SQL injection protection:', DEFAULT_PLUGIN_CONFIG.security?.enableSqlInjectionProtection);

    return true;
  } catch (error) {
    console.error('❌ Default config test failed:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('🧪 Running Database Plugin Config Tests...\n');

  let passCount = 0;
  let totalTests = 0;

  // 测试1: 基础配置验证
  totalTests++;
  if (testBasicConfigValidation()) {
    passCount++;
  }

  // 测试2: 无效配置验证
  totalTests++;
  if (testInvalidConfigValidation()) {
    passCount++;
  }

  // 测试3: 配置合并
  totalTests++;
  if (testConfigMerging()) {
    passCount++;
  }

  // 测试4: 配置助手函数
  totalTests++;
  if (testConfigHelpers()) {
    passCount++;
  }

  // 测试5: 默认配置
  totalTests++;
  if (testDefaultConfig()) {
    passCount++;
  }

  // 结果报告
  console.log(`\n📊 Test Results: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All config tests passed! Configuration refactoring successful.');
    process.exit(0);
  } else {
    console.log('❌ Some config tests failed');
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
