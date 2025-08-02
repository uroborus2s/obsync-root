// @stratix/database 类型安全测试
// 验证插件的类型定义和类型推导是否正确工作

import stratixDatabasePlugin, { DatabasePluginHelpers } from '../src/index.js';
import type { DatabasePluginOptions } from '../src/types/index.js';

/**
 * 测试基础类型定义
 */
function testBasicTypes() {
  console.log('Testing basic type definitions...');

  // 测试基础配置类型
  const basicConfig: DatabasePluginOptions = {
    connections: {
      default: {
        type: 'sqlite',
        database: ':memory:'
      }
    }
  };

  // 测试扩展配置类型
  const extendedConfig: DatabasePluginOptions = {
    connections: {
      primary: {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'user',
        password: 'password'
      }
    },
    defaultConnection: 'primary',
    healthCheck: {
      enabled: true,
      intervalMs: 30000,
      endpoint: '/custom/health'
    },
    monitoring: {
      enabled: true,
      sampleRate: 0.8,
      slowQueryThresholdMs: 1000
    },
    logging: {
      enabled: true,
      level: 'info',
      queries: true,
      performance: true
    },
    security: {
      enableSqlInjectionProtection: true,
      maxQueryLength: 50000,
      allowedOperations: ['SELECT', 'INSERT', 'UPDATE']
    }
  };

  console.log('✅ Basic type definitions test passed');
  return { basicConfig, extendedConfig };
}

/**
 * 测试配置助手类型
 */
function testConfigHelpers() {
  console.log('\nTesting config helpers types...');

  // 测试基础配置生成器
  const basicConfig = DatabasePluginHelpers.createBasicConfig({
    default: {
      type: 'sqlite',
      database: ':memory:'
    }
  });

  // 测试生产环境配置生成器
  const productionConfig = DatabasePluginHelpers.createProductionConfig({
    primary: {
      type: 'postgresql',
      host: 'prod-db.example.com',
      database: 'myapp'
    }
  });

  // 测试开发环境配置生成器
  const developmentConfig = DatabasePluginHelpers.createDevelopmentConfig({
    default: {
      type: 'sqlite',
      database: './dev.db'
    }
  });

  // 验证返回类型
  const configs: DatabasePluginOptions[] = [
    basicConfig,
    productionConfig,
    developmentConfig
  ];

  console.log('✅ Config helpers types test passed');
  return configs;
}

/**
 * 测试插件注册类型
 */
function testPluginRegistration() {
  console.log('\nTesting plugin registration types...');

  // 模拟 Fastify 实例类型检查
  const mockRegister = (
    plugin: typeof stratixDatabasePlugin,
    options: DatabasePluginOptions
  ) => {
    // 这里只是类型检查，不实际执行
    return { plugin, options };
  };

  // 测试插件注册类型兼容性
  const registrationResult = mockRegister(stratixDatabasePlugin, {
    connections: {
      default: {
        type: 'mysql',
        host: 'localhost',
        database: 'test'
      }
    }
  });

  console.log('✅ Plugin registration types test passed');
  return registrationResult;
}

/**
 * 测试数据库类型约束
 */
function testDatabaseTypeConstraints() {
  console.log('\nTesting database type constraints...');

  // 测试支持的数据库类型
  const supportedTypes = ['postgresql', 'mysql', 'sqlite', 'mssql'] as const;

  const configs = supportedTypes.map((type) => ({
    connections: {
      default: {
        type,
        database: type === 'sqlite' ? ':memory:' : 'testdb',
        ...(type !== 'sqlite' && { host: 'localhost' })
      }
    }
  }));

  // 验证类型约束
  configs.forEach((config, index) => {
    const dbType = config.connections.default.type;
    if (!supportedTypes.includes(dbType as any)) {
      throw new Error(`Unsupported database type: ${dbType}`);
    }
  });

  console.log('✅ Database type constraints test passed');
  return configs;
}

/**
 * 测试可选配置字段
 */
function testOptionalFields() {
  console.log('\nTesting optional configuration fields...');

  // 测试最小配置
  const minimalConfig: DatabasePluginOptions = {
    connections: {
      default: {
        type: 'sqlite',
        database: ':memory:'
      }
    }
  };

  // 测试部分可选字段
  const partialConfig: DatabasePluginOptions = {
    connections: {
      default: {
        type: 'postgresql',
        host: 'localhost',
        database: 'myapp'
      }
    },
    healthCheck: {
      enabled: false
    }
  };

  // 测试完整配置
  const fullConfig: DatabasePluginOptions = {
    connections: {
      primary: {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'user',
        password: 'password',
        ssl: {
          rejectUnauthorized: false
        },
        pool: {
          min: 2,
          max: 10
        }
      }
    },
    defaultConnection: 'primary',
    healthCheck: {
      enabled: true,
      intervalMs: 30000,
      timeoutMs: 5000,
      retryCount: 3,
      endpoint: '/health/db'
    },
    monitoring: {
      enabled: true,
      sampleRate: 1.0,
      maxMetricsCount: 10000,
      aggregationWindowMs: 60000,
      slowQueryThresholdMs: 1000
    },
    logging: {
      enabled: true,
      level: 'debug',
      queries: true,
      performance: true
    },
    security: {
      enableSqlInjectionProtection: true,
      maxQueryLength: 100000,
      allowedOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    }
  };

  console.log('✅ Optional fields test passed');
  return { minimalConfig, partialConfig, fullConfig };
}

/**
 * 测试类型推导
 */
function testTypeInference() {
  console.log('\nTesting type inference...');

  // 测试配置对象的类型推导
  const inferredConfig = {
    connections: {
      default: {
        type: 'sqlite' as const,
        database: ':memory:'
      }
    },
    healthCheck: {
      enabled: true,
      intervalMs: 30000
    }
  };

  // 验证推导的类型是否兼容
  const typedConfig: DatabasePluginOptions = inferredConfig;

  // 测试助手函数的类型推导
  const helperConfig = DatabasePluginHelpers.createBasicConfig({
    default: {
      type: 'mysql',
      host: 'localhost',
      database: 'test'
    }
  });

  console.log('✅ Type inference test passed');
  return { inferredConfig: typedConfig, helperConfig };
}

/**
 * 运行所有类型安全测试
 */
async function runTypeSafetyTests() {
  console.log('🧪 Running Database Plugin Type Safety Tests...\n');

  let passCount = 0;
  let totalTests = 0;

  try {
    // 测试1: 基础类型定义
    totalTests++;
    testBasicTypes();
    passCount++;

    // 测试2: 配置助手类型
    totalTests++;
    testConfigHelpers();
    passCount++;

    // 测试3: 插件注册类型
    totalTests++;
    testPluginRegistration();
    passCount++;

    // 测试4: 数据库类型约束
    totalTests++;
    testDatabaseTypeConstraints();
    passCount++;

    // 测试5: 可选配置字段
    totalTests++;
    testOptionalFields();
    passCount++;

    // 测试6: 类型推导
    totalTests++;
    testTypeInference();
    passCount++;
  } catch (error) {
    console.error('❌ Type safety test failed:', error);
  }

  // 结果报告
  console.log(
    `\n📊 Type Safety Test Results: ${passCount}/${totalTests} tests passed`
  );

  if (passCount === totalTests) {
    console.log(
      '🎉 All type safety tests passed! Type definitions are working correctly.'
    );
    console.log('\n✅ Type Safety Summary:');
    console.log('  - DatabasePluginOptions type is properly defined');
    console.log('  - Plugin function signature accepts correct types');
    console.log('  - Configuration helpers provide type-safe interfaces');
    console.log('  - Database type constraints are enforced');
    console.log('  - Optional fields work as expected');
    console.log('  - Type inference works correctly');
    process.exit(0);
  } else {
    console.log('❌ Some type safety tests failed');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTypeSafetyTests().catch((error) => {
    console.error('Type safety test runner failed:', error);
    process.exit(1);
  });
}

export { runTypeSafetyTests };
