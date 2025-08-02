/**
 * 创建日志配置
 */
export const createLoggerConfig = (envConfig) => {
    const { sensitiveInfo, environment } = envConfig;
    // 环境特定的默认日志级别
    const defaultLevel = environment === 'production' ? 'info' : 'debug';
    return {
        level: sensitiveInfo.logger?.loglevle || defaultLevel,
        disableRequestLogging: sensitiveInfo.logger?.disableRequestLogging || false
    };
};
//# sourceMappingURL=logger.config.js.map