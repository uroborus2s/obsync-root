// 简化的插件参数处理功能使用示例
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
// 示例 1: 基本参数处理 - 设置默认值和转换
const basicPlugin = withRegisterAutoDI(myPlugin, {
    // 参数处理函数：设置默认值、转换参数
    parameterProcessor: (options) => {
        const opts = options;
        // 设置默认值
        const processed = {
            apiUrl: 'https://api.example.com',
            timeout: 5000,
            retries: 3,
            enableCache: true,
            features: [],
            ...opts // 用户传入的参数覆盖默认值
        };
        // 参数转换
        if (typeof processed.timeout === 'string') {
            processed.timeout = parseInt(processed.timeout, 10);
        }
        if (typeof processed.features === 'string') {
            processed.features = processed.features.split(',').map(f => f.trim());
        }
        // 标准化 API URL
        if (processed.apiUrl && !processed.apiUrl.startsWith('http')) {
            processed.apiUrl = `https://${processed.apiUrl}`;
        }
        return processed;
    },
    debug: true
});
// 示例 2: 参数校验
const validatedPlugin = withRegisterAutoDI(myPlugin, {
    // 参数处理函数：设置默认值
    parameterProcessor: (options) => {
        const opts = options;
        return {
            apiUrl: 'https://api.example.com',
            timeout: 5000,
            retries: 3,
            enableCache: false,
            ...opts
        };
    },
    // 参数校验函数
    parameterValidator: (options) => {
        const opts = options;
        // 校验 API URL
        if (!opts.apiUrl || typeof opts.apiUrl !== 'string') {
            console.error('API URL is required and must be a string');
            return false;
        }
        try {
            const url = new URL(opts.apiUrl);
            if (url.protocol !== 'https:') {
                console.error('API URL must use HTTPS');
                return false;
            }
        }
        catch {
            console.error('Invalid API URL format');
            return false;
        }
        // 校验超时时间
        if (opts.timeout && (typeof opts.timeout !== 'number' || opts.timeout < 1000 || opts.timeout > 30000)) {
            console.error('Timeout must be a number between 1000 and 30000');
            return false;
        }
        // 校验重试次数
        if (opts.retries && (typeof opts.retries !== 'number' || opts.retries < 0 || opts.retries > 10)) {
            console.error('Retries must be a number between 0 and 10');
            return false;
        }
        return true;
    },
    debug: true
});
// 示例 3: 复杂参数处理和校验
const advancedPlugin = withRegisterAutoDI(myPlugin, {
    // 参数处理函数：复杂的参数处理逻辑
    parameterProcessor: (options) => {
        const opts = options;
        // 环境变量替换
        if (opts.apiUrl === '${API_URL}') {
            opts.apiUrl = process.env.API_URL || 'https://api.example.com';
        }
        // 设置默认值
        const processed = {
            apiUrl: 'https://api.example.com',
            timeout: 5000,
            retries: 3,
            enableCache: true,
            features: [],
            ...opts
        };
        // 参数转换和标准化
        if (typeof processed.timeout === 'string') {
            processed.timeout = parseInt(processed.timeout, 10);
            if (isNaN(processed.timeout)) {
                processed.timeout = 5000;
            }
        }
        if (typeof processed.features === 'string') {
            processed.features = processed.features.split(',').map(f => f.trim());
        }
        // 确保 features 是有效的
        const validFeatures = ['logging', 'metrics', 'tracing', 'monitoring'];
        processed.features = processed.features.filter(f => validFeatures.includes(f));
        // 添加计算属性
        processed.totalTimeout = processed.timeout * (processed.retries + 1);
        return processed;
    },
    // 参数校验函数：全面的校验逻辑
    parameterValidator: (options) => {
        const opts = options;
        // 必需参数校验
        if (!opts.apiUrl) {
            console.error('API URL is required');
            return false;
        }
        // URL 格式校验
        try {
            const url = new URL(opts.apiUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                console.error('API URL must use HTTP or HTTPS protocol');
                return false;
            }
        }
        catch {
            console.error('Invalid API URL format');
            return false;
        }
        // 数值范围校验
        if (opts.timeout < 1000 || opts.timeout > 30000) {
            console.error('Timeout must be between 1000ms and 30000ms');
            return false;
        }
        if (opts.retries < 0 || opts.retries > 10) {
            console.error('Retries must be between 0 and 10');
            return false;
        }
        // 类型校验
        if (typeof opts.enableCache !== 'boolean') {
            console.error('enableCache must be a boolean');
            return false;
        }
        if (!Array.isArray(opts.features)) {
            console.error('features must be an array');
            return false;
        }
        return true;
    },
    debug: true
});
// 示例 4: 只有参数处理，没有校验
const processingOnlyPlugin = withRegisterAutoDI(myPlugin, {
    parameterProcessor: (options) => {
        const opts = options;
        // 深度合并默认配置
        const defaults = {
            apiUrl: 'https://api.example.com',
            timeout: 5000,
            retries: 3,
            enableCache: true,
            cacheConfig: {
                ttl: 300,
                maxSize: 1000
            },
            features: ['logging']
        };
        // 简单的深度合并
        function deepMerge(target, source) {
            const result = { ...target };
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = deepMerge(result[key] || {}, source[key]);
                }
                else {
                    result[key] = source[key];
                }
            }
            return result;
        }
        return deepMerge(defaults, opts);
    },
    debug: true
});
// 使用示例
export function demonstrateSimplifiedParameters() {
    console.log('=== 简化插件参数处理演示 ===\n');
    // 模拟 Fastify 实例
    const mockFastify = {
        get: (path, handler) => {
            console.log(`Route registered: GET ${path}`);
        }
    };
    console.log('1. 基本参数处理:');
    try {
        basicPlugin(mockFastify, {
            timeout: '8000', // 字符串会被转换为数字
            features: 'logging,metrics', // 字符串会被转换为数组
            apiUrl: 'api.example.com' // 会自动添加 https://
        });
    }
    catch (error) {
        console.error('Error:', error.message);
    }
    console.log('\n2. 参数校验:');
    try {
        // 这会触发校验错误
        validatedPlugin(mockFastify, {
            apiUrl: 'http://api.example.com', // HTTP 会被拒绝
            timeout: 50000 // 超出范围
        });
    }
    catch (error) {
        console.error('Validation Error:', error.message);
    }
    console.log('\n3. 高级参数处理和校验:');
    try {
        advancedPlugin(mockFastify, {
            apiUrl: '${API_URL}', // 环境变量替换
            timeout: '10000', // 字符串转数字
            features: 'logging,metrics,invalid' // 无效的 feature 会被过滤
        });
    }
    catch (error) {
        console.error('Error:', error.message);
    }
    console.log('\n4. 只有参数处理:');
    try {
        processingOnlyPlugin(mockFastify, {
            timeout: 8000,
            cacheConfig: {
                ttl: 600 // 只覆盖 ttl，保留 maxSize 默认值
            }
        });
    }
    catch (error) {
        console.error('Error:', error.message);
    }
}
// 导出插件示例
export { basicPlugin, validatedPlugin, advancedPlugin, processingOnlyPlugin };
//# sourceMappingURL=simplified-plugin-parameters-example.js.map