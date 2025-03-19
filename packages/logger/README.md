# @stratix/logger

高性能、灵活的结构化日志记录库，基于 [pino](https://github.com/pinojs/pino) 实现。

## 特性

- **高性能**：采用JSON格式的异步日志记录，最小化对应用性能的影响
- **结构化日志**：所有日志条目均为JSON格式，便于后续分析和处理
- **多级别支持**：提供trace、debug、info、warn、error、fatal六个日志级别
- **可扩展性**：支持自定义序列化器、日志格式和输出目标
- **生产就绪**：内置日志轮转、安全脱敏和异常捕获功能

## 安装

```bash
npm install @stratix/logger
```

## 基本使用

```typescript
// 引入Stratix框架和日志插件
import { createApp } from 'stratix';
import loggerPlugin from '@stratix/logger';

// 创建应用实例并注册日志插件
const app = createApp();
app.register(loggerPlugin, {
  level: 'info',  // 设置日志级别
  prettyPrint: process.env.NODE_ENV !== 'production'  // 开发环境美化输出
});

// 启动应用后使用日志
await app.start();

// 框架自带日志访问器
app.log.info('Application started');
app.log.error({ err: new Error('Something went wrong') }, 'Error occurred');

// 通过依赖注入使用
app.inject('myService', async (container) => {
  const logger = await container.resolve('logger');
  
  return {
    doSomething: () => {
      logger.info('Service is doing something');
      try {
        // 业务逻辑
      } catch (err) {
        logger.error({ err }, 'Operation failed');
      }
    }
  };
});
```

## 高级配置

```typescript
// 高级配置示例
app.register(loggerPlugin, {
  // 基本配置
  level: 'info',
  name: 'my-app',
  
  // 输出目标配置
  destination: './logs/app.log',  // 输出到文件
  
  // 同时输出到多个目标
  targets: [
    { level: 'info', target: process.stdout },
    { level: 'error', target: './logs/error.log' }
  ],
  
  // 格式化配置
  prettyPrint: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'hostname,pid'
  },
  
  // 上下文数据
  base: {
    app: 'my-service',
    env: process.env.NODE_ENV
  },
  
  // 日志轮转配置
  rotation: {
    size: '10M',      // 文件大小轮转
    interval: '1d',   // 时间轮转
    maxFiles: 7,      // 保留文件数
    compress: true    // 压缩旧日志
  },
  
  // 性能优化
  optimization: {
    bufferSize: 10,       // 缓冲区大小
    flushInterval: 1000   // 刷新间隔(ms)
  }
});
```

## 子日志记录器

```typescript
// 创建子日志记录器
const logger = await app.resolve('logger');
const userLogger = logger.child({ module: 'user-service' });

userLogger.info({ userId: 123 }, 'User logged in');
// 输出包含 { module: 'user-service', userId: 123, msg: 'User logged in' }
```

## 自定义序列化器

```typescript
app.register(loggerPlugin, {
  serializers: {
    user: (user) => ({
      id: user.id,
      username: user.username
      // 不包含敏感信息
    })
  }
});

logger.info({ user: userData }, 'User registered');
```

## API文档

详细API文档请参考 [文档目录](./docs)。

## 许可证

MIT