/**
 * Stratix应用配置文件示例
 */
module.exports = {
  // 应用名称
  name: 'ConfigApp示例',

  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    host: '0.0.0.0'
  },

  // 日志配置
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV === 'development',
    destination: process.env.LOG_FILE || './logs/app.log'
  },

  // 插件配置
  plugins: {
    core: {
      autoloadRoutes: true,
      routesDir: './src/routes'
    }
  },

  // 自定义配置
  app: {
    version: '1.0.0',
    description: '通过配置文件创建的Stratix应用'
  }
};
