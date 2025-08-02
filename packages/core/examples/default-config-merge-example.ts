// 默认配置合并功能使用示例

import { withRegisterAutoDI } from '../src/plugin/plugin-utils.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

// 示例插件选项接口
interface MyPluginOptions extends FastifyPluginOptions {
  apiUrl?: string;
  timeout?: number;
  features?: string[];
}

// 原始插件函数
async function myPlugin(fastify: FastifyInstance, options: MyPluginOptions) {
  console.log('Plugin loaded with options:', options);
  
  fastify.get('/api/status', async () => {
    return {
      status: 'ok',
      config: options
    };
  });
}

// 示例 1: 使用默认配置（最小配置）
const minimalPlugin = withRegisterAutoDI(myPlugin);
// 这将使用所有默认配置：
// - discovery.patterns: ['controllers/**/*.{ts,js}', 'services/**/*.{ts,js}', 'repositories/**/*.{ts,js}']
// - routing.enabled: true
// - services.enabled: true
// - lifecycle.enabled: true
// - debug: false

// 示例 2: 部分覆盖默认配置
const customizedPlugin = withRegisterAutoDI(myPlugin, {
  // 只覆盖需要修改的配置，其他使用默认值
  discovery: {
    patterns: ['controllers/*.{ts,js}'] // 只扫描 controllers 目录
  },
  debug: true // 启用调试模式
  // routing, services, lifecycle 等都使用默认配置
});

// 示例 3: 深度合并嵌套配置
const deepMergePlugin = withRegisterAutoDI(myPlugin, {
  lifecycle: {
    // 只覆盖 healthCheck 的部分配置
    healthCheck: {
      enabled: true,
      endpoint: '/custom-health'
      // 其他 healthCheck 配置使用默认值：
      // detailed: false, detailedEndpoint: '/health/detailed' 等
    }
    // 其他 lifecycle 配置使用默认值：
    // enabled: true, errorHandling: 'throw', debug: false
  }
});

// 示例 4: 添加参数处理和校验
const enhancedPlugin = withRegisterAutoDI(myPlugin, {
  // 使用默认的 discovery, routing, services, lifecycle 配置
  
  // 添加参数处理
  parameterProcessor: (options) => {
    return {
      apiUrl: 'https://api.example.com',
      timeout: 5000,
      features: [],
      ...options // 用户参数覆盖默认值
    };
  },
  
  // 添加参数校验
  parameterValidator: (options) => {
    if (!options.apiUrl) {
      console.error('API URL is required');
      return false;
    }
    return true;
  },
  
  debug: true
});

// 示例 5: 完全自定义配置（覆盖所有默认值）
const fullyCustomPlugin = withRegisterAutoDI(myPlugin, {
  discovery: {
    patterns: [
      'custom-controllers/**/*.{ts,js}',
      'custom-services/**/*.{ts,js}'
    ],
    baseDir: './custom-src'
  },
  
  routing: {
    enabled: true,
    validation: true,
    prefix: '/api/v2'
  },
  
  services: {
    enabled: true,
    patterns: ['adapters/**/*.{ts,js}'],
    registrationOptions: {
      prefix: 'custom',
      separator: '_'
    }
  },
  
  lifecycle: {
    enabled: true,
    errorHandling: 'log',
    debug: true,
    healthCheck: {
      enabled: true,
      endpoint: '/status',
      detailed: true,
      detailedEndpoint: '/status/detailed',
      lifecycleStatus: true,
      lifecycleEndpoint: '/status/lifecycle'
    }
  },
  
  parameterProcessor: (options) => {
    return {
      apiUrl: 'https://custom-api.example.com',
      timeout: 10000,
      features: ['logging', 'metrics'],
      ...options
    };
  },
  
  parameterValidator: (options) => {
    // 自定义校验逻辑
    return options.timeout > 0 && options.timeout < 30000;
  },
  
  debug: true
});

// 使用示例
export function demonstrateDefaultConfigMerge() {
  console.log('=== 默认配置合并演示 ===\n');
  
  // 模拟 Fastify 实例
  const mockFastify = {
    get: (path: string, handler: Function) => {
      console.log(`Route registered: GET ${path}`);
    }
  } as any;
  
  console.log('1. 最小配置（使用所有默认值）:');
  try {
    minimalPlugin(mockFastify, {
      apiUrl: 'https://test.com'
    });
    console.log('✅ 最小配置插件加载成功');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n2. 部分自定义配置（深度合并）:');
  try {
    customizedPlugin(mockFastify, {
      timeout: 8000
    });
    console.log('✅ 自定义配置插件加载成功');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n3. 深度合并嵌套配置:');
  try {
    deepMergePlugin(mockFastify, {
      features: ['monitoring']
    });
    console.log('✅ 深度合并配置插件加载成功');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n4. 增强插件（参数处理 + 默认配置）:');
  try {
    enhancedPlugin(mockFastify, {
      timeout: 3000
    });
    console.log('✅ 增强插件加载成功');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n5. 完全自定义配置:');
  try {
    fullyCustomPlugin(mockFastify, {
      apiUrl: 'https://override.com'
    });
    console.log('✅ 完全自定义配置插件加载成功');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// 配置对比示例
export function showConfigComparison() {
  console.log('\n=== 配置合并对比 ===\n');
  
  // 默认配置
  console.log('默认配置:');
  console.log({
    discovery: {
      patterns: ['controllers/**/*.{ts,js}', 'services/**/*.{ts,js}', 'repositories/**/*.{ts,js}']
    },
    routing: { enabled: true, validation: false },
    services: { enabled: true },
    lifecycle: {
      enabled: true,
      errorHandling: 'throw',
      debug: false,
      healthCheck: {
        enabled: false,
        endpoint: '/health',
        detailed: false,
        detailedEndpoint: '/health/detailed',
        lifecycleStatus: false,
        lifecycleEndpoint: '/health/lifecycle'
      }
    },
    debug: false
  });
  
  // 用户配置
  console.log('\n用户配置:');
  const userConfig = {
    discovery: {
      patterns: ['controllers/*.{ts,js}']
    },
    lifecycle: {
      healthCheck: {
        enabled: true,
        endpoint: '/custom-health'
      }
    },
    debug: true
  };
  console.log(userConfig);
  
  // 合并后的配置（使用 @stratix/utils 的 deepMerge）
  console.log('\n合并后的配置:');
  console.log({
    discovery: {
      patterns: ['controllers/*.{ts,js}'] // 用户配置覆盖
    },
    routing: { enabled: true, validation: false }, // 保持默认值
    services: { enabled: true }, // 保持默认值
    lifecycle: {
      enabled: true, // 保持默认值
      errorHandling: 'throw', // 保持默认值
      debug: false, // 保持默认值
      healthCheck: {
        enabled: true, // 用户配置覆盖
        endpoint: '/custom-health', // 用户配置覆盖
        detailed: false, // 保持默认值
        detailedEndpoint: '/health/detailed', // 保持默认值
        lifecycleStatus: false, // 保持默认值
        lifecycleEndpoint: '/health/lifecycle' // 保持默认值
      }
    },
    debug: true // 用户配置覆盖
  });
}

// 导出插件示例
export {
  minimalPlugin,
  customizedPlugin,
  deepMergePlugin,
  enhancedPlugin,
  fullyCustomPlugin
};
