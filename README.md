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

## 文档

本项目支持自动生成API文档。详细指南请查看：

```bash
pnpm run docs:guide
```

或直接查看 `docs/API-DOCS-GUIDE.md` 文件。

### 快速命令

```bash
# 生成所有API文档
pnpm run docs:generate

# 增量生成（只处理更新的包）
pnpm run docs:generate:incremental

# 仅生成@stratix/utils的文档
pnpm run docs:utils

# 生成文档并启动文档站点
pnpm run docs:utils:serve
```

## API 文档生成

本项目使用 [API Extractor](https://api-extractor.com/) 和 [Docusaurus](https://docusaurus.io/) 生成 API 文档。

### 安装依赖

确保已安装所有依赖：

```bash
pnpm install
```

### 生成 API 文档

执行以下命令生成 API 文档：

```bash
pnpm docs:generate
```

这将执行以下步骤：

1. 安装自定义 API Documenter 模板
2. 生成 API 文档
3. 修复 Markdown 文件的兼容性问题
4. 配置 Docusaurus 侧边栏

### 预览文档

生成文档后，可以使用以下命令启动 Docusaurus 预览：

```bash
pnpm docs:preview
```

然后在浏览器中访问 http://localhost:3000 查看文档。

### 注释规范

API 文档是根据代码中的 TSDoc 注释生成的。请遵循 [docs/tsdoc-guide.md](docs/tsdoc-guide.md) 中的注释规范。

主要注意点：

- 使用 `@public`、`@internal`、`@beta` 或 `@alpha` 标记 API 可见性
- 参数描述必须使用连字符 `-` 分隔
- 使用 `@remarks` 标签添加版本、分类等信息
- 示例代码应放在代码块中，并指定语言

示例：

```typescript
/**
 * 函数描述
 * 
 * 详细说明
 *
 * @param name - 参数描述
 * @returns 返回值描述
 * @remarks
 * 版本: 1.0.0
 * 分类: 工具函数
 *
 * @example
 * ```typescript
 * const result = myFunction('test');
 * ```
 * @public
 */
function myFunction(name: string): string {
  // 实现
}
```

## 许可证

MIT

# 配置指南

## 敏感配置注入

该项目使用直接注入方式处理敏感配置信息，通过环境变量安全地传递敏感数据，如密码、API密钥等。

### 基本原理

1. 配置文件现在是一个接收敏感信息的函数：
   ```typescript
   // stratix.config.ts
   export default (sensitiveInfo: any) => ({
     database: {
       password: sensitiveInfo.database?.password || '默认值'
     }
   });
   ```

2. 系统启动时：
   - 从环境变量`STRATIX_SENSITIVE_CONFIG`中获取加密的敏感信息
   - 用密钥解密信息
   - 将解密后的信息作为参数传递给配置函数

### 使用方法

#### 1. 创建敏感信息文件

创建一个包含敏感信息的JSON文件，例如`sensitive-info.json`：
```json
{
  "database": {
    "password": "super-secret-password"
  },
  "api": {
    "key": "production-api-key-12345"
  }
}
```

#### 2. 加密敏感信息

使用内置工具加密敏感信息：
```bash
# 设置加密密钥
export STRATIX_ENCRYPTION_KEY="your-encryption-key"

# 加密并输出为环境变量格式
npx stratix-encrypt-sensitive ./sensitive-info.json -e
```

这将生成一个可设置的环境变量，如：
```bash
export STRATIX_SENSITIVE_CONFIG="加密后的字符串..."
```

#### 3. 设置环境变量

将上述命令的输出设置为环境变量：
```bash
# 复制上一步输出的命令并执行
export STRATIX_SENSITIVE_CONFIG="加密后的字符串..."
```

#### 4. 在配置中使用

在`stratix.config.ts`中，以函数形式接收并使用敏感配置：
```typescript
export default (sensitiveInfo: any) => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    // 使用传入的敏感信息
    password: sensitiveInfo.database?.password || 'default-password'
  }
});
```

### 优势

- 配置文件中可明确看到哪些值来自敏感配置
- 调试更容易，问题更容易定位
- 支持默认值和条件逻辑处理
- 不需要复杂的合并操作

## 重要变更通知

### 日志记录器变更

现在框架使用Fastify的内置日志记录器替代了之前的自定义实现。这带来以下变化：

1. 应用实例的`logger`属性现在直接指向Fastify的logger
2. 不再需要单独创建和配置日志记录器
3. 通过应用配置中的`logger`选项可以配置Fastify的日志行为

使用示例:

```typescript
// 使用Fastify logger
app.logger.info('这是一条信息');
app.logger.error('发生错误', new Error('错误详情'));

// 创建带上下文的子logger
const routeLogger = app.logger.child({ route: '/users' });
routeLogger.info('路由请求');
```

`@stratix/core/logging`模块仍然可用，但标记为已弃用，建议直接使用Fastify的logger。

### 函数式编程工具移除

`packages/core/src/fp`模块已被移除，请改用`@stratix/utils/common`中的函数式编程工具替代：

| 已移除函数               | 替代方案                        |
|------------------------|--------------------------------|
| `@stratix/core/fp/compose` | `@stratix/utils/common/compose` |
| `@stratix/core/fp/curry`   | `@stratix/utils/common/curry`   |
| `@stratix/core/fp/pipe`    | `@stratix/utils/common/pipe`    |
| `@stratix/core/fp/memoize` | `@stratix/utils/common/memoize` |

使用示例:

```typescript
// 修改前
import { compose, curry, pipe, memoize } from '@stratix/core/fp';

// 修改后
import { compose, curry, pipe, memoize } from '@stratix/utils/common';
```

`@stratix/utils`包中的函数式编程工具更加完善，提供了更多功能：

- composeAsync/pipeAsync - 异步函数组合
- partial - 部分应用函数
- once - 只执行一次的函数
- 以及更多高阶函数工具
