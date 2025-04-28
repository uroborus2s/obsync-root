# @stratix/web 中间件使用示例

本文档提供了在 @stratix/web 框架中使用中间件的各种示例，包括全局中间件、路由特定中间件以及中间件组合等用法。

## 基本概念

中间件是一种函数，它可以访问请求对象、响应对象和应用程序请求-响应周期中的下一个中间件函数。中间件可以：

- 执行任何代码
- 修改请求和响应对象
- 结束请求-响应周期
- 调用堆栈中的下一个中间件

## 创建中间件

### 基本中间件结构

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { MiddlewareContext } from '@stratix/web';

// 基本中间件函数
export async function myMiddleware(
  request: FastifyRequest, 
  reply: FastifyReply, 
  context: MiddlewareContext
) {
  // 在请求处理前执行的逻辑
  console.log('请求开始处理:', request.url);
  
  // 调用下一个中间件
  await context.next();
  
  // 在响应返回前执行的逻辑
  console.log('响应状态码:', reply.statusCode);
}
```

### 中间件上下文

中间件上下文 `MiddlewareContext` 提供了以下功能：

- `next()`: 调用下一个中间件
- `data`: 在中间件之间共享数据的对象
- `params`: 访问路由参数

## 全局中间件

全局中间件将应用于所有路由。

### 注册全局中间件

```typescript
import { createServer } from '@stratix/web';
import { myLogger } from './middlewares/logger';
import { authCheck } from './middlewares/auth';

const server = createServer();

// 注册单个全局中间件
server.middlewareManager.use(myLogger);

// 注册多个全局中间件（按顺序执行）
server.middlewareManager.use([
  authCheck,
  myLogger
]);

server.start();
```

### 日志中间件示例

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { MiddlewareContext } from '@stratix/web';

export async function loggerMiddleware(
  request: FastifyRequest, 
  reply: FastifyReply, 
  context: MiddlewareContext
) {
  const start = Date.now();
  const { method, url } = request;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} 开始处理`);
  
  try {
    // 继续处理请求
    await context.next();
    
    // 请求处理完成后记录日志
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${url} 完成 - ${reply.statusCode} (${duration}ms)`);
  } catch (error) {
    // 处理错误
    const duration = Date.now() - start;
    console.error(`[${new Date().toISOString()}] ${method} ${url} 错误 - ${error.message} (${duration}ms)`);
    throw error; // 继续抛出错误，让错误处理器处理
  }
}
```

### 身份验证中间件示例

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { MiddlewareContext } from '@stratix/web';
import jwt from 'jsonwebtoken';

export async function authMiddleware(
  request: FastifyRequest, 
  reply: FastifyReply, 
  context: MiddlewareContext
) {
  // 从请求头获取 token
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: '未提供授权令牌' });
    return; // 不调用 next()，终止中间件链
  }
  
  const token = authHeader.substring(7); // 移除 "Bearer " 前缀
  
  try {
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 将解码后的用户信息存储在请求对象中，供后续中间件和路由处理器使用
    request.user = decoded;
    
    // 继续处理请求
    await context.next();
  } catch (error) {
    // token 无效或已过期
    reply.code(401).send({ error: '无效或已过期的令牌' });
  }
}
```

## 路由特定中间件

路由特定中间件只应用于特定的路由。

### 为路由添加中间件

```typescript
import { createServer } from '@stratix/web';
import { authMiddleware } from './middlewares/auth';
import { validateUserInput } from './middlewares/validator';

const server = createServer();

// 为特定路由添加中间件
server.route({
  method: 'POST',
  url: '/users',
  middlewares: [authMiddleware, validateUserInput],
  handler: async (request, reply) => {
    // 路由处理逻辑
    const user = await createUser(request.body);
    return { id: user.id };
  }
});

// 使用中间件组也有效
server.route({
  method: 'GET',
  url: '/users/:id',
  middlewares: 'auth', // 使用预定义的中间件组
  handler: async (request, reply) => {
    const user = await getUserById(request.params.id);
    return user;
  }
});

server.start();
```

### 输入验证中间件示例

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { MiddlewareContext } from '@stratix/web';
import { z } from 'zod';

// 使用 Zod 定义验证架构
const userSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function validateUserInput(
  request: FastifyRequest, 
  reply: FastifyReply, 
  context: MiddlewareContext
) {
  try {
    // 验证请求体
    const validatedData = userSchema.parse(request.body);
    
    // 用验证后的数据替换请求体
    request.body = validatedData;
    
    // 继续处理请求
    await context.next();
  } catch (error) {
    // 处理验证错误
    if (error instanceof z.ZodError) {
      reply.code(400).send({
        error: '输入验证失败',
        details: error.errors
      });
    } else {
      // 其他错误
      reply.code(500).send({ error: '服务器内部错误' });
    }
  }
}
```

## 中间件组

中间件组允许将多个中间件组合在一起，并为其指定一个名称，便于重用。

### 定义中间件组

```typescript
import { createServer } from '@stratix/web';
import { authMiddleware } from './middlewares/auth';
import { loggerMiddleware } from './middlewares/logger';
import { rateLimit } from './middlewares/rateLimit';

const server = createServer();

// 定义中间件组
server.middlewareManager.group('api', [
  loggerMiddleware,
  rateLimit,
  authMiddleware
]);

// 定义管理员中间件组
server.middlewareManager.group('admin', [
  loggerMiddleware,
  authMiddleware,
  async (request, reply, context) => {
    // 检查用户是否具有管理员权限
    if (!request.user.isAdmin) {
      reply.code(403).send({ error: '权限不足' });
      return;
    }
    await context.next();
  }
]);

// 在路由中使用中间件组
server.route({
  method: 'GET',
  url: '/api/users',
  middlewares: 'api',
  handler: async (request, reply) => {
    // ...
  }
});

server.route({
  method: 'DELETE',
  url: '/api/users/:id',
  middlewares: 'admin',
  handler: async (request, reply) => {
    // ...
  }
});

server.start();
```

## 路径匹配中间件

可以为特定的 URL 路径模式应用中间件。

```typescript
import { createServer } from '@stratix/web';
import { authMiddleware } from './middlewares/auth';

const server = createServer();

// 为所有以 /api 开头的路由应用中间件
server.middlewareManager.use('/api/*', authMiddleware);

// 为特定的路径模式应用多个中间件
server.middlewareManager.use('/admin/*', [
  authMiddleware,
  async (request, reply, context) => {
    // 检查管理员权限
    if (!request.user.isAdmin) {
      reply.code(403).send({ error: '权限不足' });
      return;
    }
    await context.next();
  }
]);

// 启动服务器
server.start();
```

## 高级用例

### 中间件数据共享

中间件可以通过上下文的 `data` 属性在中间件之间共享数据。

```typescript
// 第一个中间件
async function firstMiddleware(request, reply, context) {
  // 设置数据
  context.data.startTime = Date.now();
  // 继续处理
  await context.next();
}

// 第二个中间件
async function secondMiddleware(request, reply, context) {
  // 访问第一个中间件设置的数据
  const startTime = context.data.startTime;
  // 设置新数据
  context.data.userId = extractUserId(request);
  // 继续处理
  await context.next();
}

// 第三个中间件
async function thirdMiddleware(request, reply, context) {
  // 访问前面中间件设置的数据
  const { startTime, userId } = context.data;
  console.log(`处理用户 ${userId} 的请求，距开始已过去 ${Date.now() - startTime}ms`);
  // 继续处理
  await context.next();
}
```

### 条件中间件

根据某些条件决定是否应用中间件。

```typescript
async function conditionalMiddleware(request, reply, context) {
  // 检查是否在维护模式
  const isMaintenanceMode = await checkMaintenanceMode();
  
  if (isMaintenanceMode) {
    // 在维护模式下，返回维护页面
    reply.code(503).send({ error: '系统维护中，请稍后再试' });
    return;
  }
  
  // 非维护模式，继续处理请求
  await context.next();
}
```

### 错误处理中间件

专门用于捕获和处理错误的中间件。

```typescript
async function errorHandlerMiddleware(request, reply, context) {
  try {
    // 尝试执行后续中间件
    await context.next();
  } catch (error) {
    // 捕获并处理错误
    console.error('请求处理错误:', error);
    
    // 根据错误类型设置适当的状态码和错误消息
    if (error.name === 'ValidationError') {
      reply.code(400).send({ error: '输入验证失败', details: error.details });
    } else if (error.name === 'AuthenticationError') {
      reply.code(401).send({ error: '身份验证失败' });
    } else if (error.name === 'NotFoundError') {
      reply.code(404).send({ error: '请求的资源不存在' });
    } else {
      // 默认为服务器内部错误
      reply.code(500).send({ 
        error: '服务器内部错误',
        // 在开发环境中提供更多错误详情
        ...(process.env.NODE_ENV === 'development' && { 
          message: error.message,
          stack: error.stack
        })
      });
    }
  }
}
```

### 异步操作中间件

处理异步操作，如数据库连接的中间件。

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { MiddlewareContext } from '@stratix/web';
import { getDbConnection } from './database';

export async function databaseMiddleware(
  request: FastifyRequest, 
  reply: FastifyReply, 
  context: MiddlewareContext
) {
  let connection;
  
  try {
    // 获取数据库连接
    connection = await getDbConnection();
    
    // 将连接添加到请求对象或上下文数据中
    context.data.db = connection;
    
    // 继续处理请求
    await context.next();
  } catch (error) {
    // 处理数据库错误
    console.error('数据库错误:', error);
    reply.code(500).send({ error: '数据库操作失败' });
  } finally {
    // 确保在请求完成后关闭连接
    if (connection) {
      await connection.close();
    }
  }
}
```

## 完整示例

以下是一个使用多种中间件的完整服务器配置示例：

```typescript
import { createServer } from '@stratix/web';
import { loggerMiddleware } from './middlewares/logger';
import { errorHandlerMiddleware } from './middlewares/errorHandler';
import { authMiddleware } from './middlewares/auth';
import { databaseMiddleware } from './middlewares/database';
import { validateUserInput } from './middlewares/validator';
import { rateLimit } from './middlewares/rateLimit';
import { cors } from './middlewares/cors';

// 创建服务器实例
const server = createServer({
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});

// 注册全局中间件（按顺序执行）
server.middlewareManager.use([
  errorHandlerMiddleware, // 首先注册错误处理中间件，捕获所有后续错误
  loggerMiddleware,       // 记录所有请求
  cors,                   // 处理跨域
  databaseMiddleware      // 提供数据库连接
]);

// 定义中间件组
server.middlewareManager.group('auth', [
  authMiddleware,         // 身份验证
  rateLimit              // 速率限制
]);

server.middlewareManager.group('admin', [
  'auth',                // 使用 auth 中间件组
  async (req, rep, ctx) => {
    // 检查管理员权限
    if (!req.user.isAdmin) {
      rep.code(403).send({ error: '权限不足' });
      return;
    }
    await ctx.next();
  }
]);

// 公开路由
server.route({
  method: 'GET',
  url: '/',
  handler: async (request, reply) => {
    return { message: '欢迎访问 API' };
  }
});

// 用户注册路由（使用验证中间件）
server.route({
  method: 'POST',
  url: '/users',
  middlewares: [validateUserInput],
  handler: async (request, reply) => {
    const user = await createUser(request.body);
    return { id: user.id, message: '用户创建成功' };
  }
});

// 受保护的用户路由（使用 auth 中间件组）
server.route({
  method: 'GET',
  url: '/users/me',
  middlewares: 'auth',
  handler: async (request, reply) => {
    return request.user;
  }
});

// 管理员路由（使用 admin 中间件组）
server.route({
  method: 'GET',
  url: '/admin/users',
  middlewares: 'admin',
  handler: async (request, reply) => {
    const users = await getAllUsers();
    return { users };
  }
});

// 启动服务器
server.start().then(() => {
  console.log(`服务器运行在 http://localhost:${server.port}`);
});
```

## 最佳实践

1. **中间件顺序很重要**：中间件按照注册的顺序执行，错误处理中间件通常应该最先注册，以捕获后续中间件中的错误。

2. **保持中间件的专注性**：每个中间件应该只关注一个功能，如身份验证、日志记录或错误处理。

3. **使用中间件组进行组织**：将相关的中间件组合到一起，以便在不同的路由中重用。

4. **避免阻塞操作**：由于中间件是按顺序执行的，长时间运行的同步操作会阻塞整个请求处理流程。尽量使用异步操作。

5. **正确处理错误**：确保在中间件中捕获和处理错误，或者让错误传播到错误处理中间件。

6. **明确调用 next()**：除非你想终止中间件链（例如在错误情况下），否则始终调用 `context.next()`。

7. **利用上下文共享数据**：使用 `context.data` 在中间件之间共享数据，避免污染请求或响应对象。 