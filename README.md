# Stratix Framework

Stratix是一个基于Node.js的轻量级应用框架，采用插件化架构，遵循函数式编程思想。

## 项目结构

本项目采用monorepo结构，使用pnpm和turbo进行管理。

```
packages/
├── stratix/            # 核心框架
├── stratix-logger/     # 日志插件
├── stratix-cron/       # 定时任务插件
└── stratix-web/        # Web服务插件
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
pnpm build
```

### 开发模式

```bash
pnpm dev
```

### 测试

```bash
pnpm test
```

## 核心框架

Stratix核心框架提供了以下功能：

- **插件系统**：支持插件注册、依赖管理和生命周期管理
- **依赖注入**：基于awilix的依赖注入系统
- **钩子系统**：支持生命周期钩子和自定义钩子
- **错误处理**：统一的错误处理机制
- **装饰器系统**：支持应用实例的扩展

详细文档请参考[Stratix框架文档](./packages/stratix/README.md)。

## 插件

### 日志插件

提供日志记录功能，支持多级别日志和格式化。

### 定时任务插件

提供任务调度和定时执行功能，支持cron表达式。

### Web服务插件

提供HTTP服务器功能，支持路由、中间件和请求处理。

## 许可证

MIT
