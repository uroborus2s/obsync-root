# Stratix

Stratix是一个轻量级的Node.js应用框架，基于Fastify构建，具有良好的可扩展性和灵活的插件系统。

## 特性

- **插件系统**：通过插件轻松扩展应用功能
- **配置管理**：支持多种配置源（文件、环境变量、内联）
- **钩子系统**：完整的生命周期事件钩子
- **装饰器模式**：轻松扩展应用实例功能
- **日志系统**：基于pino的高性能日志

## 安装

```bash
npm install stratix
```

## 快速开始

### 基本用法

```js
import { createApp } from 'stratix';

// 创建应用
const app = createApp({
  name: '我的应用',
  config: {
    server: {
      port: 3000
    }
  }
});

// 注册路由
app.fastify.get('/', async (request, reply) => {
  return { hello: 'world' };
});

// 启动应用
app.start()
  .then(() => {
    console.log('应用已启动');
  })
  .catch(err => {
    console.error('启动失败:', err);
    process.exit(1);
  });
```

### 使用配置文件

```js
// app.config.js
module.exports = {
  name: 'ConfigApp',
  server: {
    port: 3000
  },
  logger: {
    level: 'info'
  }
};
```

```js
import { createAppFromConfig } from 'stratix';
import path from 'path';

// 从配置文件创建应用
const configPath = path.join(__dirname, 'app.config.js');
createAppFromConfig(configPath)
  .then(app => {
    // 注册路由
    app.fastify.get('/', async () => ({ hello: 'world' }));
    
    // 启动应用
    return app.start();
  })
  .then(() => {
    console.log('应用已启动');
  })
  .catch(err => {
    console.error('启动失败:', err);
    process.exit(1);
  });
```

## 插件开发

```js
import { StratixPlugin } from 'stratix';

// 创建一个简单的插件
function createMyPlugin(): StratixPlugin {
  return {
    name: 'my-plugin',
    
    // 可选的依赖
    dependencies: ['core'],
    
    // 插件注册函数
    async register(app, options) {
      app.logger.info('我的插件已注册');
      
      // 添加路由
      app.fastify.get('/my-plugin', async () => {
        return { plugin: 'my-plugin' };
      });
      
      // 添加装饰器
      app.decorate('greet', (name) => `你好, ${name}!`);
    }
  };
}

export default createMyPlugin();
```

## 示例

查看 [examples](./examples) 目录获取更多示例。

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build
```

## 许可证

MIT 