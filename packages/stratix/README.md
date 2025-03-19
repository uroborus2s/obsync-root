# Stratix

Stratix是一个基于Node.js的轻量级应用框架，采用插件化架构，遵循函数式编程思想。

## 特点

- **插件化架构**：所有功能通过插件实现和扩展
- **依赖注入**：基于awilix提供强大的依赖注入能力
- **生命周期钩子**：支持框架和插件生命周期管理
- **封装与装饰器**：支持插件间的封装和扩展
- **类型安全**：使用TypeScript开发，提供完整类型定义
- **默认插件**：提供日志和定时任务等核心功能作为默认插件
- **插件服务代理**：支持通过框架实例直接调用插件服务

## 安装

```bash
npm install stratix
```

## 基本使用

```typescript
// 创建应用实例
import { createApp } from 'stratix';

// 创建应用
const app = createApp({
  name: 'my-app',
  logger: {
    level: 'info'
  }
});

// 注册插件
app.register(require('@stratix/web'), {
  port: 3000
});

// 启动应用
await app.start();

// 使用默认日志插件
app.log.info('应用已启动');

// 优雅关闭
process.on('SIGTERM', async () => {
  await app.close();
});
```

## 使用配置文件

Stratix支持通过配置文件创建和初始化应用，使用更加简洁。

### 配置文件（stratix.config.ts）

```typescript
import { Context } from '@obsync/stratix';

export default (ctx: Context) => {
  const loggerPlugin = {
    name: 'logger',
    props: {
      level: {
        type: 'string',
        default: 'info'
      }
    }
  };

  const cachePlugin = {
    name: '@obsync/stratix-cache',
    factory: createCachePlugin,
    dependencies: ['logger']
  };

  return {
    name: 'my-app',
    type: 'app',
    version: '0.0.1',
    plugins: [loggerPlugin, cachePlugin]
  };
};
```

### 启动应用（index.ts）

```typescript
import Stratix from '@obsync/stratix';

Stratix.run().catch((err) => {
  console.error('应用启动失败:', err);
  process.exit(1);
});
```

## 插件注册

```typescript
// 注册单个插件
app.register(webPlugin, { port: 3000 });

// 链式调用
app.register(dbPlugin, {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'my_db',
    user: 'username',
    password: 'password'
  }
}).register(require('./plugins/myPlugin'), { 
  // 插件选项 
});
```

## 依赖注入

```typescript
// 注册服务
app.inject('userService', async (container) => {
  const db = await container.resolve('db');
  const logger = await container.resolve('logger');
  
  return {
    findById: async (id) => {
      logger.debug(`Finding user by id: ${id}`);
      return db.users.findById(id);
    }
  };
});

// 使用服务
const userService = await app.resolve('userService');
const user = await userService.findById('123');
```

## 钩子系统

```typescript
// 添加钩子
app.addHook('beforeStart', async () => {
  console.log('应用即将启动');
});

app.addHook('afterStart', async () => {
  console.log('应用已启动');
});

// 自定义钩子
app.addHook('customEvent', async (payload) => {
  console.log('自定义事件触发', payload);
});

// 触发自定义钩子
await app.runHook('customEvent', { data: 'test' });
```

## 错误处理

```typescript
// 设置错误处理器
app.setErrorHandler((err, req, reply) => {
  console.error('应用错误:', err);
  reply.code(500).send({ error: err.message });
});

// 创建自定义错误
const NotFoundError = app.createError('NotFound', { statusCode: 404 });
throw new NotFoundError('资源未找到');
```

## 插件开发

```typescript
// 创建插件
const myPlugin = {
  name: 'myPlugin',
  dependencies: ['web'],
  register: async (app, options) => {
    // 注册服务
    app.inject('myService', () => ({
      doSomething: () => 'done'
    }));
    
    // 添加钩子
    app.addHook('afterStart', async () => {
      console.log('myPlugin已启动');
    });
    
    // 装饰应用
    app.decorate('myUtil', () => 'util');
  }
};

// 使用插件
app.register(myPlugin, { /* 选项 */ });
```

## 许可证

MIT 