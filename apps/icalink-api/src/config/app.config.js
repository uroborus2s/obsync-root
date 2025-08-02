/**
 * 创建应用配置
 */
export const createAppConfig = (envConfig) => {
    return {
        name: 'stratix-example-app',
        version: '1.0.0',
        description: 'Stratix框架示例应用',
        environment: envConfig.environment,
        debug: envConfig.debug
    };
};
//# sourceMappingURL=app.config.js.map