# Fastify使用教程

## 1. 基础路由定义

Fastify提供了简洁的API来定义HTTP路由：

```javascript
// 基本路由定义
const fastify = require('fastify')();

// GET请求
fastify.get('/', async (request, reply) => {
  return { hello: 'world' };
});

// POST请求
fastify.post('/users', async (request, reply) => {
  const { name, email } = request.body;
  // 处理创建用户...
  return { id: 1, name, email };
});

// 路由参数
fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params;
  // 查询用户...
  return { id, name: 'User ' + id };
});

// 查询参数
fastify.get('/search', async (request, reply) => {
  const { q, limit = 10 } = request.query;
  // 搜索...
  return { results: [], query: q, limit };
});
```

## 2. 请求和响应处理

Fastify提供了丰富的请求和响应处理功能：

```javascript
// 自定义状态码
fastify.post('/items', async (request, reply) => {
  // 创建资源...
  return reply.code(201).send({ id: 1, created: true });
});

// 设置响应头
fastify.get('/download', async (request, reply) => {
  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', 'attachment; filename=report.pdf');
  return reply.send(pdfBuffer);
});

// 重定向
fastify.get('/old-path', async (request, reply) => {
  return reply.redirect(301, '/new-path');
});

// 发送流
fastify.get('/stream', async (request, reply) => {
  const stream = fs.createReadStream('some-file.txt');
  return reply.send(stream);
});
```

## 3. Schema验证

Fastify内置JSON Schema验证，可以为请求和响应定义Schema：

```javascript
const userSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 18 }
  }
};

fastify.post('/users', {
  schema: {
    body: userSchema,
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  // 处理创建用户...
  return { id: 1, ...request.body };
});
```

## 4. 钩子(Hooks)

Fastify提供多个生命周期钩子来处理请求和响应：

```javascript
// 全局钩子
fastify.addHook('onRequest', async (request, reply) => {
  // 请求到达时执行
  console.log('收到请求:', request.url);
});

fastify.addHook('preHandler', async (request, reply) => {
  // 处理程序执行前
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  // 响应发送后
  console.log(`请求处理耗时: ${Date.now() - request.startTime}ms`);
});

fastify.addHook('onError', async (request, reply, error) => {
  // 发生错误时
  console.error('请求处理错误:', error);
});

// 路由级钩子
fastify.get('/protected',
  {
    preHandler: async (request, reply) => {
      // 路由特定的钩子，如认证
      if (!request.headers.authorization) {
        reply.code(401).send({ error: 'Unauthorized' });
        return reply;
      }
    }
  },
  async (request, reply) => {
    return { data: 'protected data' };
  }
);
```

## 5. 中间件

Fastify支持Express风格的中间件：

```javascript
// 安装中间件支持
fastify.register(require('@fastify/express'));

// 注册中间件
fastify.use(require('cors')());
fastify.use(require('helmet')());

// 路由特定中间件
fastify.use('/api', (req, res, next) => {
  console.log('API请求:', req.url);
  next();
});
```

## 6. 插件系统

Fastify的插件系统是其核心特性之一：

```javascript
// 创建插件
const myPlugin = (fastify, options, done) => {
  // 注册钩子
  fastify.addHook('onRequest', async (request, reply) => {
    console.log('插件请求钩子');
  });
  
  // 添加装饰器
  fastify.decorate('utility', {
    calculateTax: (amount) => amount * 0.2
  });
  
  // 注册路由
  fastify.get('/plugin-route', async (request, reply) => {
    return { plugin: true };
  });
  
  done();
};

// 注册插件
fastify.register(myPlugin);

// 带选项注册插件
fastify.register(require('@fastify/cors'), {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// 限定作用域的插件
fastify.register((instance, options, done) => {
  // 此处的路由只在此作用域可见
  instance.get('/scoped', async (req, reply) => {
    return { scoped: true };
  });
  
  // 添加作用域内可见的装饰器
  instance.decorate('scopedUtility', () => {});
  
  done();
});
```

## 7. 封装性(Encapsulation)

Fastify的插件系统提供了封装性，使得插件内部的装饰器和设置不会泄漏到外部：

```javascript
// 父作用域
fastify.register((parent, opts, done) => {
  parent.decorate('parentUtil', () => 'parent');
  
  // 子作用域
  parent.register((child, opts, done) => {
    // 可以访问父作用域的装饰器
    console.log(child.parentUtil()); // 'parent'
    
    // 添加子作用域装饰器
    child.decorate('childUtil', () => 'child');
    done();
  });
  
  // 父作用域无法访问子作用域的装饰器
  // parent.childUtil() 会抛出错误
  
  done();
});
```

## 8. 装饰器(Decorators)

装饰器允许在Fastify实例上添加自定义功能：

```javascript
// 装饰Fastify实例
fastify.decorate('db', new Database());

// 装饰请求对象
fastify.decorateRequest('user', null);
fastify.addHook('preHandler', async (request, reply) => {
  request.user = await getUser(request);
});

// 装饰响应对象
fastify.decorateReply('sendError', function(message, code = 400) {
  return this.code(code).send({ error: message });
});

// 使用装饰器
fastify.get('/users', async (request, reply) => {
  try {
    const users = await fastify.db.getUsers();
    return users;
  } catch (err) {
    return reply.sendError('Failed to fetch users', 500);
  }
});
```

## 9. 内容类型解析

Fastify支持自定义内容类型解析器：

```javascript
// 注册内容类型解析器
fastify.addContentTypeParser('application/xml', {
  parseAs: 'string'
}, (req, body, done) => {
  try {
    const parsed = xmlParser.parse(body);
    done(null, parsed);
  } catch (err) {
    done(err);
  }
});

// 使用自定义内容类型
fastify.post('/xml-endpoint', async (request, reply) => {
  // request.body 已经是解析后的XML
  return { received: true, data: request.body };
});
```

## 10. 错误处理

Fastify提供了完善的错误处理机制：

```javascript
// 自定义错误处理器
fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    // 处理验证错误
    return reply.status(400).send({
      success: false,
      message: 'Validation failed',
      errors: error.validation
    });
  }
  
  // 其他错误
  request.log.error(error);
  reply.status(error.statusCode || 500).send({
    success: false,
    message: error.message || 'Internal Server Error'
  });
});

// 自定义Not Found处理器
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    message: `Route ${request.method}:${request.url} not found`
  });
});

// 抛出自定义错误
fastify.get('/error-demo', async () => {
  const error = new Error('Something went wrong');
  error.statusCode = 400;
  throw error;
});
```

## 11. 日志

Fastify内置了高性能的日志系统：

```javascript
// 创建带自定义日志配置的实例
const fastify = require('fastify')({
  logger: {
    level: 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers
        };
      }
    },
    redact: ['req.headers.authorization'],
    prettyPrint: process.env.NODE_ENV !== 'production'
  }
});

// 使用日志
fastify.get('/log-demo', async (request, reply) => {
  request.log.info('处理请求');
  request.log.debug({ data: request.query }, '请求详情');
  
  // 处理逻辑...
  
  request.log.info('请求处理完成');
  return { success: true };
});
```

## 12. 服务器启动与关闭

```javascript
// 启动服务器
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`服务器运行在 ${fastify.server.address().port} 端口`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  fastify.log.info('正在关闭服务器...');
  await fastify.close();
  fastify.log.info('服务器已关闭');
  process.exit(0);
});

start();
```

## 13. 路由注册选项

Fastify允许为路由定义多种选项：

```javascript
fastify.route({
  method: ['GET', 'POST'], // 支持多个HTTP方法
  url: '/multi-method',
  handler: async (request, reply) => {
    const method = request.method;
    return { method, message: `Handled ${method} request` };
  }
});

// 使用配置对象
fastify.route({
  method: 'POST',
  url: '/advanced',
  schema: {
    body: { /* schema定义 */ },
    response: { /* schema定义 */ }
  },
  preHandler: [
    // 多个钩子函数
    async (request, reply) => { /* 验证 */ },
    async (request, reply) => { /* 日志 */ }
  ],
  onRequest: async (request, reply) => { /* 请求预处理 */ },
  handler: async (request, reply) => { /* 主处理函数 */ },
  errorHandler: (error, request, reply) => { /* 路由级错误处理 */ }
});
```

## 14. 插件依赖处理

Fastify允许定义插件之间的依赖关系：

```javascript
const fp = require('fastify-plugin');

// 定义数据库插件
const dbPlugin = fp(async (fastify, options) => {
  const db = connectToDatabase(options);
  fastify.decorate('db', db);
  
  fastify.addHook('onClose', async (instance) => {
    await db.close();
  });
});

// 定义依赖数据库的认证插件
const authPlugin = fp(async (fastify, options) => {
  // 确保数据库插件已加载
  if (!fastify.db) {
    throw new Error('依赖的数据库插件未加载');
  }
  
  fastify.decorate('authenticate', async (request, reply) => {
    // 使用数据库验证用户...
  });
});

// 注册插件并确保依赖顺序
fastify.register(dbPlugin);
fastify.register(authPlugin); // 会在dbPlugin之后加载
```

## 15. 静态文件服务

使用`@fastify/static`插件提供静态文件服务：

```javascript
const path = require('path');

// 注册静态文件插件
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/', // 可选的URL前缀
  decorateReply: false // 是否添加sendFile方法到reply对象
});

// 访问 /public/images/logo.png 将返回本地文件系统中的 public/images/logo.png
```

## 16. 模板渲染

使用`@fastify/view`插件支持模板渲染：

```javascript
// 注册视图渲染插件
fastify.register(require('@fastify/view'), {
  engine: {
    ejs: require('ejs')
  },
  root: path.join(__dirname, 'views'),
  defaultContext: {
    // 模板全局变量
    appName: 'My Fastify App'
  }
});

// 使用模板渲染
fastify.get('/', async (request, reply) => {
  return reply.view('index.ejs', {
    title: 'Home Page',
    content: 'Welcome to our website!'
  });
});
```

## 17. WebSocket支持

使用`@fastify/websocket`插件添加WebSocket支持：

```javascript
// 注册WebSocket插件
fastify.register(require('@fastify/websocket'));

// 处理WebSocket连接
fastify.get('/ws', { websocket: true }, (connection, req) => {
  connection.socket.on('message', message => {
    // 处理接收到的消息
    console.log('接收到消息:', message.toString());
    
    // 发送响应
    connection.socket.send(JSON.stringify({
      response: 'Server received: ' + message.toString()
    }));
  });
  
  // 连接关闭处理
  connection.socket.on('close', () => {
    console.log('WebSocket连接关闭');
  });
});
```

## 18. Cookie处理

使用`@fastify/cookie`插件处理Cookie：

```javascript
// 注册Cookie插件
fastify.register(require('@fastify/cookie'), {
  secret: 'my-secret', // 用于签名cookie
  parseOptions: {}     // cookie解析选项
});

// 设置Cookie
fastify.get('/set-cookie', (request, reply) => {
  reply.setCookie('sessionId', '123456', {
    path: '/',
    signed: true,
    httpOnly: true,
    maxAge: 86400 // 24小时有效
  });
  
  return { success: true };
});

// 读取Cookie
fastify.get('/get-cookie', (request, reply) => {
  const sessionId = request.cookies.sessionId;
  const signedCookie = request.unsignCookie(sessionId);
  
  return {
    raw: sessionId,
    unsigned: signedCookie.value,
    valid: signedCookie.valid
  };
});
```

## 19. 会话管理

使用`@fastify/session`插件处理会话：

```javascript
// 注册Session插件
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  cookieName: 'sessionId',
  secret: 'a-very-long-secret-key',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000 // 24小时
  }
});

// 使用会话
fastify.get('/login', async (request, reply) => {
  // 模拟登录，设置会话数据
  request.session.user = {
    id: 1,
    username: 'user1',
    role: 'admin'
  };
  
  return { success: true, message: '登录成功' };
});

fastify.get('/profile', async (request, reply) => {
  // 检查会话
  if (!request.session.user) {
    reply.code(401);
    return { error: '未登录' };
  }
  
  return { profile: request.session.user };
});

fastify.get('/logout', async (request, reply) => {
  // 销毁会话
  request.destroySession(err => {
    if (err) {
      reply.code(500);
      return { error: '登出失败' };
    }
  });
  
  return { success: true, message: '登出成功' };
});
```

## 20. 文件上传

使用`@fastify/multipart`插件处理文件上传：

```javascript
// 注册文件上传插件
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
  }
});

// 处理单文件上传
fastify.post('/upload', async (request, reply) => {
  const data = await request.file();
  
  // 获取文件信息
  console.log('文件名:', data.filename);
  console.log('MIME类型:', data.mimetype);
  
  // 处理文件数据
  const buffer = await data.toBuffer();
  // 或者保存到磁盘
  await pump(data.file, fs.createWriteStream(`./uploads/${data.filename}`));
  
  return { success: true, filename: data.filename };
});

// 处理多文件上传
fastify.post('/upload-multiple', async (request, reply) => {
  const files = [];
  
  const parts = request.parts();
  for await (const part of parts) {
    if (part.file) {
      // 处理文件
      const filename = part.filename;
      await pump(part.file, fs.createWriteStream(`./uploads/${filename}`));
      files.push(filename);
    } else {
      // 处理普通字段
      console.log(`字段 ${part.fieldname} 的值: ${part.value}`);
    }
  }
  
  return { success: true, files };
});
```

## 21. 压缩

使用`@fastify/compress`插件启用响应压缩：

```javascript
// 注册压缩插件
fastify.register(require('@fastify/compress'), {
  global: false, // 是否为所有路由开启
  threshold: 1024 // 只压缩大于1KB的响应
});

// 在特定路由上启用压缩
fastify.get('/compressed', {
  compress: true
}, async (request, reply) => {
  return { data: '大量文本数据...' };
});
```

## 22. CORS配置

使用`@fastify/cors`插件处理跨域请求：

```javascript
// 注册CORS插件
fastify.register(require('@fastify/cors'), {
  origin: ['https://example.com', 'https://subdomain.example.com'],
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Custom-Header'],
  credentials: true,
  maxAge: 86400 // 预检请求结果缓存24小时
});

// 也可以使用函数动态决定是否允许
fastify.register(require('@fastify/cors'), {
  origin: (origin, cb) => {
    const allowedOrigins = ['https://example.com', 'https://subdomain.example.com'];
    
    // 是否允许特定来源
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('不允许的来源'), false);
    }
  }
});
```

## 23. 自定义序列化

Fastify允许自定义响应序列化以优化性能：

```javascript
// 使用fast-json-stringify优化序列化
const fastJson = require('fast-json-stringify');

// 创建序列化函数
const stringify = fastJson({
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    profile: {
      type: 'object',
      properties: {
        age: { type: 'integer' },
        email: { type: 'string' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' }
    }
  }
});

// 使用自定义序列化
fastify.get('/optimized', async (request, reply) => {
  const data = {
    id: 1,
    name: 'John',
    profile: { age: 30, email: 'john@example.com' },
    tags: ['user', 'admin']
  };
  
  reply.send(stringify(data));
});

// 或者通过schema自动使用fast-json-stringify
fastify.get('/users/:id', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  // Fastify会使用schema自动优化序列化
  return { id: 1, name: 'John', email: 'john@example.com' };
});
```

## 24. 路由版本控制

Fastify支持API版本控制：

```javascript
// 启用版本控制
fastify.register(async function v1(fastify, opts) {
  fastify.get('/api/users', async (request, reply) => {
    // v1版本处理逻辑
    return [{ id: 1, name: 'User 1' }];
  });
}, { prefix: '/v1' });

fastify.register(async function v2(fastify, opts) {
  fastify.get('/api/users', async (request, reply) => {
    // v2版本处理逻辑
    return [{ 
      id: 1, 
      name: 'User 1',
      profile: { /* 新增字段 */ }
    }];
  });
}, { prefix: '/v2' });
```

## 25. 健康检查与监控

设置健康检查和监控端点：

```javascript
// 健康检查端点
fastify.get('/health', async (request, reply) => {
  // 检查各种依赖组件是否正常工作
  const dbStatus = await checkDatabaseConnection();
  const cacheStatus = await checkCacheConnection();
  
  const isHealthy = dbStatus.ok && cacheStatus.ok;
  
  // 如果不健康，返回503状态码
  if (!isHealthy) {
    reply.code(503);
  }
  
  return {
    status: isHealthy ? 'ok' : 'error',
    time: new Date().toISOString(),
    services: {
      database: dbStatus,
      cache: cacheStatus
    }
  };
});

// 添加监控中间件
fastify.register(require('@fastify/express'));
fastify.use(require('express-prometheus-middleware')({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 5]
}));
```

这个详尽的Fastify教程涵盖了框架的主要功能和高级用法，为使用Fastify开发Node.js应用提供了全面的参考。 