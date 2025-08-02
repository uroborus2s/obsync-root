// 增强插件参数处理功能使用示例
import { withRegisterAutoDI } from '../src/plugin/plugin-utils.js';
// 原始插件函数
async function myPlugin(fastify, options) {
    console.log('Plugin loaded with options:', options);
    // 注册路由
    fastify.get('/api/status', async () => {
        return {
            status: 'ok',
            config: {
                apiUrl: options.apiUrl,
                timeout: options.timeout,
                cacheEnabled: options.enableCache
            }
        };
    });
}
// 示例 1: 基本参数处理 - 默认参数合并
const basicEnhancedPlugin = withRegisterAutoDI(myPlugin, {
    // 插件默认参数
    pluginDefaults: {
        apiUrl: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
        enableCache: true,
        cacheConfig: {
            ttl: 300,
            maxSize: 1000
        },
        features: ['logging', 'metrics']
    },
    // 参数处理配置
    parameterProcessing: {
        enabled: true,
        deepMerge: true // 使用深度合并
    },
    debug: true
});
// 示例 2: 参数校验
const validatedPlugin = withRegisterAutoDI(myPlugin, {
    pluginDefaults: {
        apiUrl: 'https://api.example.com',
        timeout: 5000,
        retries: 3
    },
    // 参数校验配置
    validation: {
        enabled: true,
        rules: {
            apiUrl: {
                required: true,
                type: 'string',
                pattern: /^https?:\/\/.+/,
                message: 'API URL must be a valid HTTP/HTTPS URL'
            },
            timeout: {
                type: 'number',
                min: 1000,
                max: 30000,
                message: 'Timeout must be between 1000ms and 30000ms'
            },
            retries: {
                type: 'number',
                min: 0,
                max: 10,
                message: 'Retries must be between 0 and 10'
            },
            enableCache: {
                type: 'boolean'
            },
            features: {
                type: 'array',
                enum: ['logging', 'metrics', 'tracing', 'monitoring']
            }
        },
        allowAdditionalProperties: false,
        onValidationError: 'throw'
    },
    debug: true
});
// 示例 3: 参数转换
const transformedPlugin = withRegisterAutoDI(myPlugin, {
    pluginDefaults: {
        timeout: 5000,
        enableCache: false
    },
    // 参数处理配置
    parameterProcessing: {
        enabled: true,
        // 参数转换器
        transformers: {
            // 将字符串超时转换为数字
            timeout: (value) => {
                if (typeof value === 'string') {
                    const num = parseInt(value, 10);
                    return isNaN(num) ? 5000 : num;
                }
                return value;
            },
            // 标准化 API URL
            apiUrl: (value) => {
                if (value && !value.startsWith('http')) {
                    return `https://${value}`;
                }
                return value;
            },
            // 确保 features 是数组
            features: (value) => {
                if (typeof value === 'string') {
                    return value.split(',').map(f => f.trim());
                }
                return Array.isArray(value) ? value : [];
            }
        },
        // 预处理函数
        preprocessor: (options) => {
            console.log('Preprocessing options:', options);
            // 环境变量替换
            if (options.apiUrl === '${API_URL}') {
                options.apiUrl = process.env.API_URL || 'https://api.example.com';
            }
            return options;
        },
        // 后处理函数
        postprocessor: (options) => {
            console.log('Postprocessing options:', options);
            // 添加计算属性
            options.computedConfig = {
                totalTimeout: options.timeout * (options.retries + 1),
                cacheEnabled: options.enableCache && options.cacheConfig
            };
            return options;
        }
    },
    debug: true
});
// 示例 4: 复杂参数校验
const advancedValidationPlugin = withRegisterAutoDI(myPlugin, {
    pluginDefaults: {
        apiUrl: 'https://api.example.com',
        timeout: 5000
    },
    validation: {
        enabled: true,
        rules: {
            apiUrl: {
                required: true,
                type: 'string',
                validator: (value) => {
                    try {
                        const url = new URL(value);
                        return url.protocol === 'https:' || 'API URL must use HTTPS';
                    }
                    catch {
                        return 'Invalid URL format';
                    }
                }
            },
            cacheConfig: {
                type: 'object',
                validator: (value) => {
                    if (value && typeof value === 'object') {
                        if (value.ttl && (value.ttl < 60 || value.ttl > 3600)) {
                            return 'Cache TTL must be between 60 and 3600 seconds';
                        }
                        if (value.maxSize && value.maxSize < 100) {
                            return 'Cache max size must be at least 100';
                        }
                    }
                    return true;
                }
            }
        },
        onValidationError: 'throw'
    },
    debug: true
});
// 使用示例
export function demonstrateEnhancedParameters() {
    console.log('=== 增强插件参数处理演示 ===\n');
    // 模拟 Fastify 实例
    const mockFastify = {
        get: (path, handler) => {
            console.log(`Route registered: GET ${path}`);
        }
    };
    console.log('1. 基本参数合并:');
    try {
        // 传入部分参数，会与默认参数合并
        basicEnhancedPlugin(mockFastify, {
            timeout: 8000,
            cacheConfig: {
                ttl: 600 // 只覆盖 ttl，保留 maxSize 默认值
            }
        });
    }
    catch (error) {
        console.error('Error:', error.message);
    }
    console.log('\n2. 参数校验:');
    try {
        // 这会触发校验错误
        validatedPlugin(mockFastify, {
            apiUrl: 'invalid-url',
            timeout: 50000 // 超出范围
        });
    }
    catch (error) {
        console.error('Validation Error:', error.message);
    }
    console.log('\n3. 参数转换:');
    try {
        transformedPlugin(mockFastify, {
            timeout: '10000', // 字符串会被转换为数字
            apiUrl: 'api.example.com', // 会自动添加 https://
            features: 'logging,metrics,tracing' // 字符串会被转换为数组
        });
    }
    catch (error) {
        console.error('Error:', error.message);
    }
    console.log('\n4. 高级校验:');
    try {
        advancedValidationPlugin(mockFastify, {
            apiUrl: 'http://api.example.com', // 会触发 HTTPS 校验错误
            cacheConfig: {
                ttl: 30, // 会触发范围校验错误
                maxSize: 50
            }
        });
    }
    catch (error) {
        console.error('Advanced Validation Error:', error.message);
    }
}
// 导出插件示例
export { basicEnhancedPlugin, validatedPlugin, transformedPlugin, advancedValidationPlugin };
//# sourceMappingURL=enhanced-plugin-parameters-example.js.map