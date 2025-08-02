/**
 * 创建安全配置
 */
export const createSecurityConfig = (envConfig, projectRootDir) => {
    const { environment } = envConfig;
    // 环境特定的安全配置
    const config = {};
    // CORS配置
    if (environment === 'development') {
        config.cors = {
            origin: ['http://localhost:3000', 'http://localhost:8090'],
            credentials: true
        };
    }
    else {
        config.cors = {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
            credentials: true
        };
    }
    // 速率限制
    config.rateLimit = {
        max: environment === 'production' ? 100 : 1000,
        timeWindow: '1 minute'
    };
    // Helmet安全头
    config.helmet = {
        contentSecurityPolicy: environment === 'production',
        crossOriginEmbedderPolicy: environment === 'production'
    };
    return config;
};
//# sourceMappingURL=security.config.js.map