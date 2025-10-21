---
sidebar_position: 6
---

# 错误处理

健壮的错误处理是构建可靠应用的基石。`@stratix/core` 提供了一套统一的错误处理机制和工具，帮助您优雅地捕获、分类和响应错误。

## 默认错误处理器

默认情况下，所有未在您的代码中被捕获的异常最终都会被 Fastify 的全局错误处理器捕获。`@stratix/core` 对其进行了扩展，以确保返回一个标准化的 JSON 错误响应。

如果一个路由处理器中抛出了一个错误：

```typescript
@Get('/error')
public causeError() {
  throw new Error('Something went wrong!');
}
```

客户端将会收到一个类似以下的 `500 Internal Server Error` 响应：

```json
{
  "error": {
    "message": "Something went wrong!",
    "statusCode": 500,
    "timestamp": "2023-10-27T10:00:00.000Z"
  }
}
```

### 404 Not Found

对于未匹配任何已定义路由的请求，框架会自动返回一个 `404 Not Found` 响应：

```json
{
  "error": {
    "message": "Route not found",
    "statusCode": 404,
    "path": "/non-existent-route",
    "timestamp": "2023-10-27T10:05:00.000Z"
  }
}
```

## HTTP 错误

在业务逻辑中，您经常需要返回特定的 HTTP 错误状态码（如 400, 401, 403）。直接抛出一个标准的 `Error` 对象会导致 500 错误，这通常不是我们想要的。

为了解决这个问题，您应该使用带有 `statusCode` 属性的错误对象。您可以从 `http-errors` 这个流行的库中导入错误类，或者自己创建。

```typescript
import { Controller, Get, Post } from '@stratix/core';
import createError from 'http-errors';

@Controller('/posts')
export class PostsController {
  @Get('/:id')
  public findOne(request: any) {
    const { id } = request.params;
    const post = this.findPostById(id);

    if (!post) {
      // 抛出一个 404 错误
      throw new createError.NotFound('Post not found');
    }

    return post;
  }

  @Post('/')
  public create(request: any) {
    const { title } = request.body;

    if (!title) {
      // 抛出一个 400 错误
      throw new createError.BadRequest('Title is required');
    }

    // ... 创建帖子的逻辑
  }
}
```

当这些被 `http-errors` 创建的错误被抛出时，框架会捕获它们，并使用其内置的 `statusCode` 和 `message` 来生成响应。

- `throw new createError.NotFound(...)` -> `404 Not Found`
- `throw new createError.BadRequest(...)` -> `400 Bad Request`
- `throw new createError.Unauthorized(...)` -> `401 Unauthorized`

## `ErrorUtils` 工具集

为了在框架内部和您的业务代码中统一错误处理模式，`@stratix/core` 导出了一个 `ErrorUtils` 对象，它提供了一系列实用的函数式工具。

### `safeExecute`

这是一个非常有用的包装器，用于执行那些可能会失败的操作，并在失败时提供一个默认值，同时记录错误，而不会让整个应用崩溃。

```typescript
import { ErrorUtils } from '@stratix/core';

async function fetchExternalData() {
  // 这个函数可能会因为网络问题而失败
  const data = await fetch('https://api.example.com/data');
  if (!data.ok) throw new Error('API request failed');
  return data.json();
}

async function getData() {
  const data = await ErrorUtils.safeExecute(
    () => fetchExternalData(), // 要执行的函数
    {
      defaultValue: [], // 失败时返回的默认值
      logger: console, // 用于记录错误的日志器
      context: { component: 'MyService', operation: 'getData' }, // 错误上下文
    }
  );

  // 如果 fetchExternalData 失败，data 将会是 [], 并且错误会被记录
  // 程序会继续执行，而不是崩溃
  return data;
}
```

### `wrapError`

此函数用于将一个原始错误包装成一个新的、带有更多上下文信息的错误。这在创建清晰的错误堆栈跟踪时非常有用。

```typescript
import { ErrorUtils } from '@stratix/core';

function processFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath);
    // ... process content
  } catch (error) {
    // 为原始错误添加上下文信息
    throw ErrorUtils.wrapError(error, {
      context: `Failed to process file: ${filePath}`,
      preserveStack: true, // 保留原始错误的堆栈信息
    });
  }
}
```

通过一致地使用这些错误处理工具，您可以构建出更健壮、更易于调试的应用程序。
