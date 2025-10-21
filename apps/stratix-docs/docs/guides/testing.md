---
sidebar_position: 3
---

# 指南：测试

编写测试是确保应用质量、稳定性和可维护性的关键环节。**思齐框架 (`@stratix/core`)** 的设计（尤其是依赖注入）使得编写可测试的代码变得非常容易。本指南将介绍如何使用 [Vitest](https://vitest.dev/)（一个现代化的测试框架）来为您的应用编写单元测试和集成测试。

## 测试设置

首先，安装 `vitest` 和其他一些推荐的测试工具：

```bash
pnpm add -D vitest @vitest/coverage-v8 supertest @types/supertest
```

- `vitest`: 核心测试框架。
- `@vitest/coverage-v8`: 用于生成测试覆盖率报告。
- `supertest`: 用于在集成测试中发送 HTTP 请求到您的应用。

在项目根目录创建 `vitest.config.ts` 文件：

```typescript title="vitest.config.ts"
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // 允许在测试文件中全局使用 describe, it, expect 等
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

并在 `package.json` 中添加测试脚本：

```json title="package.json"
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage"
  }
}
```

## 单元测试 (Unit Testing)

单元测试专注于测试一个独立的、最小的功能单元（例如，一个类的一个方法），并将其与应用的其余部分隔离开来。

### 测试服务 (Service)

假设我们有一个 `UserService`，它依赖于 `DatabaseService`。

```typescript title="src/user.service.ts"
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  async findUser(id: string) {
    const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }
}
```

在测试 `UserService` 时，我们不希望连接真实的数据库。因此，我们可以“模拟” (Mock) `DatabaseService`。

```typescript title="src/user.service.test.ts"
import { describe, it, expect, vi } from 'vitest';
import { UserService } from './user.service';

// 1. 创建一个 DatabaseService 的模拟对象
const mockDatabaseService = {
  query: vi.fn(), // 使用 vi.fn() 来创建一个可监视的模拟函数
};

describe('UserService', () => {
  it('should find a user by id', async () => {
    // 2. 安排模拟函数的返回值
    const mockUser = { id: '1', name: 'John Doe' };
    mockDatabaseService.query.mockResolvedValue({ rows: [mockUser] });

    // 3. 实例化被测试的服务，并传入模拟依赖
    const userService = new UserService(mockDatabaseService as any);

    // 4. 调用方法并断言结果
    const user = await userService.findUser('1');

    expect(user).toEqual(mockUser);
    // 验证模拟函数是否被正确调用
    expect(mockDatabaseService.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = ?',
      ['1']
    );
  });

  it('should return null if user not found', async () => {
    // 安排一个空的返回值
    mockDatabaseService.query.mockResolvedValue({ rows: [] });

    const userService = new UserService(mockDatabaseService as any);
    const user = await userService.findUser('2');

    expect(user).toBeNull();
  });
});
```

这就是依赖注入的威力：我们可以轻松地替换依赖项，从而实现完美的单元隔离。

## 集成测试 (Integration Testing)

集成测试用于验证多个组件（如控制器、服务和数据库）在一起协同工作时是否正确。在 **思齐框架** 中，我们通常通过启动一个完整的应用实例并向其发送真实的 HTTP 请求来进行集成测试。

`@stratix/core` 的 `StratixApplication` 对象提供了一个 `inject()` 方法，它基于 Fastify 的 `inject()`，非常适合用于测试。

### 测试控制器 (Controller)

假设我们有一个 `UsersController`。

```typescript title="src/users.controller.test.ts"
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Stratix, type StratixApplication } from '@stratix/core';

// 模拟服务，因为我们只想测试控制器和路由层
vi.mock('./user.service', () => {
  const UserService = vi.fn();
  UserService.prototype.getUsers = vi.fn(() => Promise.resolve([{ id: '1', name: 'Mock User' }]));
  return { UserService };
});

describe('UsersController (Integration)', () => {
  let app: StratixApplication;

  // 在所有测试开始前，启动一个应用实例
  beforeAll(async () => {
    app = await Stratix.run({
      type: 'web',
      config: {
        server: { port: 0 }, // 使用随机端口
        applicationAutoDI: {
          enabled: true,
          patterns: ['src/**/*.controller.ts', 'src/**/*.service.ts'],
        },
        plugins: [],
      },
    });
    await app.fastify.ready(); // 等待所有插件和路由加载完成
  });

  // 在所有测试结束后，关闭应用实例
  afterAll(async () => {
    await app.stop();
  });

  it('GET /users should return a list of users', async () => {
    // 使用 inject 方法发送一个虚拟的 HTTP 请求
    const response = await app.inject({
      method: 'GET',
      url: '/users', // 假设控制器前缀为 /users
    });

    // 断言 HTTP 状态码和响应体
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual([{
      id: '1',
      name: 'Mock User',
    }]);
  });
});
```

**关键点**:
- **`beforeAll` / `afterAll`**: 我们在测试套件的开始和结束时管理应用的生命周期，确保测试环境的干净和独立。
- **`app.inject()`**: 这个方法模拟了一个真实的 HTTP 请求，但它在内存中完成，速度非常快，无需监听真实的网络端口。
- **模拟服务**: 即使在集成测试中，我们有时也需要模拟某些层（如此处的 `UserService`），以便专注于测试控制器和路由逻辑，避免外部依赖（如数据库）的干扰。

通过结合单元测试和集成测试，您可以为您的 **思齐框架** 应用构建一个全面而强大的安全网。
