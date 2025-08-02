// API配置文件
export const API_CONFIG = {
    // API基础URL - 优先使用环境变量，然后是默认值
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    // 超时设置
    timeout: 10000,
    // 调试模式
    debug: import.meta.env.VITE_DEBUG === 'true' ||
        import.meta.env.NODE_ENV === 'development'
};
// 打印配置信息（仅在调试模式下）
if (API_CONFIG.debug) {
    console.log('API配置:', API_CONFIG);
}
//# sourceMappingURL=api-config.js.map