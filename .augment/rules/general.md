---
type: "always_apply"
---

# 项目总体说明
Stratix框架是包装fastify 5 +awilix 12 的现代化、函数式、高性能的Node.js应用框架
  - **函数式编程**: 完全采用函数式编程范式
  - **插件化架构**: 所有功能以 fastify插件的方式加载
  - **Monorepo架构**: 使用pnpm workspaces + Turbo构建系统
  - vitest和pnpm无缝结合，共用项目根目录的vitest.config
  - **依赖注入**: 基于Awilix的IOC容器管理
  - 从@stratix/utils库中获取函数式编程工具和其他工具

# 插件开发指南
## 插件文件结构
```
@stratix/my-plugin/
├── package.json                    # 插件包配置
├── index.ts                        # 插件入口文件
├── repositories/                   # 数据访问层（SCOPED）
│   ├── UserRepository.ts           # 用户仓储
│   ├── OrderRepository.ts          # 订单仓储
│   └── base/
│       └── BaseRepository.ts       # 基础仓储
├── services/                       # 业务逻辑层（SINGLETON）
│   ├── UserService.ts              # 用户服务
│   ├── OrderService.ts             # 订单服务
│   └── shared/
│       └── ValidationService.ts    # 共享验证服务
├── controllers/                    # 控制器层（SINGLETON）
│   ├── UserController.ts           # 用户控制器
│   └── OrderController.ts          # 订单控制器
├── middleware/                     # 中间件（SINGLETON）
│   ├── authMiddleware.ts           # 认证中间件
│   └── validationMiddleware.ts     # 验证中间件
├── utils/                          # 工具函数（SINGLETON）
│   ├── dateUtils.ts               # 日期工具
│   └── stringUtils.ts             # 字符串工具
└── types/                          # 类型定义
    ├── User.ts                     # 用户类型
    └── Order.ts                    # 订单类型
```
## 插件入口文件（index.ts）

```typescript
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createStratixPlugin } from '@stratix/core/architecture';

// 插件主函数 - 保持简洁，专注业务逻辑
async function myPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {

}

// 插件配置
const pluginConfig = {
  name: '@my-company/my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  prefix:'/api',
  enhancement: {
    autoDiscovery: {
      esModules: true,
      globs: ['repositories/**/*.{ts,js}', 'services/**/*.{ts,js}']
    },
    debug: process.env.NODE_ENV === 'development'
  }
};

```

# 开发说明
- 框架应用基于fastify的封装，di容器使用awilix
- 使用context7阅读fastify 5 和 awilix 12 的文档
- 阅读awilix的文档https://github.com/jeffijoe/awilix，获取最新版本特性
