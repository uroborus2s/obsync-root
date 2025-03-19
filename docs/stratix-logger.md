# Stratix日志插件设计文档 (@stratix/logger)

## 目录
- [Stratix日志插件设计文档 (@stratix/logger)](#stratix日志插件设计文档-stratixlogger)
  - [目录](#目录)
  - [1. 插件概述](#1-插件概述)
  - [2. 使用方式](#2-使用方式)
    - [2.1 基本使用](#21-基本使用)
    - [2.2 高级配置](#22-高级配置)
    - [2.3 日志分类与子日志](#23-日志分类与子日志)
    - [2.4 自定义序列化器](#24-自定义序列化器)
    - [2.5 日志轮转和归档](#25-日志轮转和归档)
  - [3. API设计](#3-api设计)
    - [3.1 插件API](#31-插件api)
    - [3.2 日志记录器API](#32-日志记录器api)
    - [3.3 配置选项](#33-配置选项)
  - [4. 实现细节](#4-实现细节)
    - [4.1 核心实现](#41-核心实现)
    - [4.2 与框架集成](#42-与框架集成)
    - [4.3 性能优化](#43-性能优化)

## 1. 插件概述

`@stratix/logger` 是Stratix框架的官方日志插件，基于高性能的 [pino](https://github.com/pinojs/pino) 日志库实现。插件提供了结构化日志记录能力，支持多种日志级别、自定义格式化、多目标输出和日志轮转功能。

核心特点：
- **高性能**：采用JSON格式的异步日志记录，最小化对应用性能的影响
- **结构化日志**：所有日志条目均为JSON格式，便于后续分析和处理
- **多级别支持**：提供trace、debug、info、warn、error、fatal六个日志级别
- **可扩展性**：支持自定义序列化器、日志格式和输出目标
- **生产就绪**：内置日志轮转、安全脱敏和异常捕获功能

## 2. 使用方式

### 2.1 基本使用

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

### 2.2 高级配置

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
    { level: 'error', target: './logs/error.log' },
    { 
      level: 'fatal', 
      target: './logs/fatal.log',
      options: { sync: true }  // 同步写入
    }
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
  
  // 时间戳配置
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  
  // 脱敏配置
  redact: {
    paths: ['password', 'user.creditCard'],
    censor: '[REDACTED]'
  }
});
```

### 2.3 日志分类与子日志

```typescript
// 创建子日志记录器
app.register(async (app) => {
  // 访问主日志记录器
  const logger = await app.resolve('logger');
  
  // 创建子日志记录器，添加上下文
  const userLogger = logger.child({ module: 'user-service' });
  const authLogger = logger.child({ module: 'auth-service', version: '1.0' });
  
  // 注册服务并使用特定日志记录器
  app.inject('userService', () => {
    return {
      createUser: (userData) => {
        userLogger.info({ userData: { ...userData, password: '[FILTERED]' } }, 'Creating new user');
        // 业务逻辑...
      }
    };
  });
  
  app.inject('authService', () => {
    return {
      login: (username) => {
        authLogger.info({ username }, 'User login attempt');
        // 业务逻辑...
      }
    };
  });
});
```

### 2.4 自定义序列化器

```typescript
// 自定义序列化器
app.register(loggerPlugin, {
  level: 'info',
  
  // 自定义序列化器
  serializers: {
    // 自定义错误序列化
    err: (err) => {
      return {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        // 添加自定义字段
        details: err.details || undefined
      };
    },
    
    // 自定义请求序列化
    req: (req) => {
      return {
        method: req.method,
        url: req.url,
        path: req.path,
        parameters: req.params,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
          'x-request-id': req.headers['x-request-id']
        }
      };
    },
    
    // 自定义用户序列化
    user: (user) => {
      return {
        id: user.id,
        username: user.username,
        role: user.role
        // 不包含敏感信息
      };
    }
  }
});
```

### 2.5 日志轮转和归档

```typescript
// 配置日志轮转
app.register(loggerPlugin, {
  level: 'info',
  destination: './logs/app.log',
  
  // 日志轮转配置
  rotation: {
    // 文件大小轮转: 达到10MB时轮转
    size: '10M',
    
    // 时间轮转: 每天轮转
    interval: '1d',
    
    // 保留数量: 保留最近7个日志文件
    maxFiles: 7,
    
    // 压缩: 自动压缩旧日志
    compress: true,
    
    // 格式化日志文件名
    filename: (time) => {
      if (!time) return 'app.log';
      const date = new Date(time);
      return `app-${date.toISOString().split('T')[0]}.log`;
    }
  }
});
```

## 3. API设计

### 3.1 插件API

```typescript
// 插件定义
interface LoggerPlugin {
  name: string;
  dependencies: string[];
  register: (app: StratixApp, options: LoggerOptions) => Promise<void>;
}

// 默认导出
export default LoggerPlugin;
```

### 3.2 日志记录器API

```typescript
// 日志记录器接口
interface Logger {
  // 日志级别方法
  trace(obj: object, msg?: string, ...args: any[]): void;
  debug(obj: object, msg?: string, ...args: any[]): void;
  info(obj: object, msg?: string, ...args: any[]): void;
  warn(obj: object, msg?: string, ...args: any[]): void;
  error(obj: object, msg?: string, ...args: any[]): void;
  fatal(obj: object, msg?: string, ...args: any[]): void;
  
  // 简化版接口
  trace(msg: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  fatal(msg: string, ...args: any[]): void;
  
  // 子日志
  child(bindings: object): Logger;
  
  // 工具方法
  isLevelEnabled(level: string): boolean;
  level: string;
  
  // 格式化消息
  formatters: {
    level: (label: string, number: number) => object;
    bindings: (bindings: object) => object;
    log: (object: object) => object;
  };
  
  // 序列化器
  serializers: Record<string, (value: any) => any>;
  
  // 自定义方法
  [key: string]: any;
}
```

### 3.3 配置选项

```typescript
// 插件配置选项
interface LoggerOptions {
  // 日志级别
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  
  // 应用名称
  name?: string;
  
  // 输出目标 (文件路径或流)
  destination?: string | NodeJS.WritableStream;
  
  // 多输出目标
  targets?: Array<{
    level: string;
    target: string | NodeJS.WritableStream;
    options?: object;
  }>;
  
  // 美化输出配置
  prettyPrint?: boolean | object;
  
  // 基础上下文数据
  base?: Record<string, any>;
  
  // 时间戳生成
  timestamp?: boolean | (() => string);
  
  // 消息格式化
  formatters?: {
    level?: (label: string, number: number) => object;
    bindings?: (bindings: object) => object;
    log?: (object: object) => object;
  };
  
  // 序列化器
  serializers?: Record<string, (value: any) => any>;
  
  // 日志轮转
  rotation?: {
    size?: string;
    interval?: string;
    maxFiles?: number;
    compress?: boolean;
    filename?: (time: number | null) => string;
  };
  
  // 敏感数据脱敏
  redact?: {
    paths?: string[];
    censor?: string | ((value: any) => any);
    remove?: boolean;
  };
  
  // 异步模式
  sync?: boolean;
  
  // 扩展选项
  [key: string]: any;
}
```

## 4. 实现细节

### 4.1 核心实现

```typescript
// pino的工厂函数封装
import pino from 'pino';
import pinoms from 'pino-multi-stream';

function createLogger(options: LoggerOptions): Logger {
  // 默认配置
  const defaultOptions = {
    level: 'info',
    base: { pid: process.pid, hostname: os.hostname() },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res
    }
  };
  
  // 合并配置
  const mergedOptions = { ...defaultOptions, ...options };
  
  // 处理多目标输出
  if (options.targets && options.targets.length > 0) {
    const streams = options.targets.map(target => {
      const streamOptions = { level: target.level, ...target.options };
      return {
        level: target.level,
        stream: typeof target.target === 'string' 
          ? fs.createWriteStream(target.target) 
          : target.target
      };
    });
    
    return pinoms({ streams, ...mergedOptions });
  }
  
  // 处理单一目标输出
  if (options.destination) {
    const destination = typeof options.destination === 'string'
      ? pino.destination(options.destination)
      : options.destination;
      
    return pino(mergedOptions, destination);
  }
  
  // 默认输出到标准输出
  return pino(mergedOptions);
}
```

### 4.2 与框架集成

```typescript
// 插件注册函数
async function register(app: StratixApp, options: LoggerOptions): Promise<void> {
  // 创建日志记录器
  const logger = createLogger(options);
  
  // 设置框架日志
  app.decorate('log', logger);
  
  // 注册到容器
  app.inject('logger', () => logger);
  
  // 请求级日志
  app.addHook('onRequest', (req, reply, done) => {
    // 为每个请求创建带请求ID的子日志
    const reqId = req.headers['x-request-id'] || uuidv4();
    const reqLogger = logger.child({ reqId });
    
    // 装饰请求和响应对象
    req.log = reqLogger;
    reply.log = reqLogger;
    
    // 记录请求开始
    reqLogger.info({ req }, 'Request received');
    
    // 在请求结束时记录
    reply.onSend((payload, next) => {
      reqLogger.info({
        res: reply,
        responseTime: reply.getResponseTime()
      }, 'Request completed');
      next(null, payload);
    });
    
    done();
  });
  
  // 错误日志
  app.addHook('onError', (req, reply, error, done) => {
    (req.log || logger).error({ 
      err: error,
      req,
      res: reply
    }, 'Request error');
    
    done();
  });
  
  // 轮转定时任务
  if (options.rotation) {
    setupRotation(logger, options.rotation);
  }
}
```

### 4.3 性能优化

```typescript
// 性能优化实现
function optimizeLogger(logger: Logger, options: LoggerOptions): Logger {
  // 日志缓冲区
  if (options.bufferSize) {
    const bufferSize = options.bufferSize;
    const buffer: any[] = [];
    let timer: NodeJS.Timeout | null = null;
    
    // 包装logger创建缓冲版本
    const bufferedLogger = Object.create(logger);
    
    // 重写日志方法
    ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((level) => {
      const originalMethod = logger[level];
      
      bufferedLogger[level] = function(...args: any[]) {
        buffer.push({ level, args, time: Date.now() });
        
        // 缓冲区满或者高级别日志立即刷新
        if (buffer.length >= bufferSize || ['error', 'fatal'].includes(level)) {
          flushBuffer();
        } else if (!timer) {
          // 设置定时器刷新
          timer = setTimeout(flushBuffer, options.flushInterval || 1000);
        }
      };
    });
    
    // 刷新缓冲区
    function flushBuffer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      
      if (buffer.length === 0) return;
      
      // 写入所有缓冲日志
      buffer.forEach(entry => {
        originalMethod.apply(logger, entry.args);
      });
      
      buffer.length = 0;
    }
    
    // 进程退出时刷新
    process.on('beforeExit', flushBuffer);
    
    return bufferedLogger;
  }
  
  return logger;
}
``` 