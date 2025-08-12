// 应用级自动依赖注入使用示例
// 展示如何在应用启动时自动加载应用级的 services、repositories、controllers

import { Stratix, Controller, Get, Post } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { StratixConfig } from '@stratix/core';

// ===== 1. 应用级服务类 =====
// 位置：src/services/UserService.ts
export class UserService {
  private users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ];

  getAllUsers() {
    return this.users;
  }

  getUserById(id: number) {
    return this.users.find(user => user.id === id);
  }

  createUser(userData: { name: string; email: string }) {
    const newUser = {
      id: this.users.length + 1,
      ...userData
    };
    this.users.push(newUser);
    return newUser;
  }
}

// ===== 2. 应用级仓储类 =====
// 位置：src/repositories/UserRepository.ts
export class UserRepository {
  private database = new Map<number, any>();

  async save(user: any) {
    this.database.set(user.id, user);
    return user;
  }

  async findById(id: number) {
    return this.database.get(id);
  }

  async findAll() {
    return Array.from(this.database.values());
  }

  async delete(id: number) {
    return this.database.delete(id);
  }
}

// ===== 3. 应用级控制器类 =====
// 位置：src/controllers/UserController.ts
@Controller()
export class UserController {
  constructor(
    private userService: UserService,
    private userRepository: UserRepository
  ) {}

  @Get('/users')
  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = this.userService.getAllUsers();
    return reply.send({ success: true, data: users });
  }

  @Get('/users/:id')
  async getUserById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    const user = this.userService.getUserById(id);
    
    if (!user) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }
    
    return reply.send({ success: true, data: user });
  }

  @Post('/users')
  async createUser(
    request: FastifyRequest<{ Body: { name: string; email: string } }>,
    reply: FastifyReply
  ) {
    const userData = request.body;
    const newUser = this.userService.createUser(userData);
    
    // 同时保存到仓储
    await this.userRepository.save(newUser);
    
    return reply.status(201).send({ success: true, data: newUser });
  }
}

// ===== 4. Stratix 配置 =====
// 位置：src/stratix.config.ts
export default function createConfig(): StratixConfig {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },

    plugins: [
      // 其他插件配置...
    ],

    // 🎯 应用级自动依赖注入配置
    applicationAutoDI: {
      enabled: true,
      patterns: [
        'services/**/*.{ts,js}',
        'repositories/**/*.{ts,js}',
        'controllers/**/*.{ts,js}'
      ],
      routing: {
        enabled: true,
        prefix: '/api', // 所有应用级路由都会有 /api 前缀
        validation: false
      },
      debug: true
    },

    autoLoad: {},
    
    logger: {
      level: 'info',
      pretty: true
    }
  } as any;
}

// ===== 5. 应用启动 =====
// 位置：src/index.ts
async function main() {
  try {
    // 🚀 启动 Stratix 应用
    const app = await Stratix.run();

    console.log('🎯 应用级自动依赖注入功能演示：');
    console.log('');
    console.log('📁 目录结构：');
    console.log('  src/');
    console.log('  ├── services/');
    console.log('  │   └── UserService.ts      # 自动注册为 userService');
    console.log('  ├── repositories/');
    console.log('  │   └── UserRepository.ts   # 自动注册为 userRepository');
    console.log('  ├── controllers/');
    console.log('  │   └── UserController.ts   # 自动注册为 userController + 路由');
    console.log('  └── stratix.config.ts');
    console.log('');
    console.log('🔗 自动注册的路由：');
    console.log('  GET  /api/users     # 获取所有用户');
    console.log('  GET  /api/users/:id # 获取指定用户');
    console.log('  POST /api/users     # 创建新用户');
    console.log('');
    console.log('✅ 应用启动成功！');
    console.log(`🌐 服务器运行在: http://localhost:3000`);
    console.log('');
    console.log('🧪 测试命令：');
    console.log('  curl http://localhost:3000/api/users');
    console.log('  curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d \'{"name":"Charlie","email":"charlie@example.com"}\'');

  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    process.exit(1);
  }
}

// ===== 6. 功能特性说明 =====
/*
🎯 应用级自动依赖注入的核心特性：

1. **自动模块发现**：
   - 扫描 services/、repositories/、controllers/ 目录
   - 自动注册到 root container（SINGLETON 生命周期）
   - 支持依赖注入（构造函数注入）

2. **自动路由注册**：
   - 检测带有 @Controller 装饰器的类
   - 自动注册 @Get、@Post 等路由到 Fastify
   - 支持路由前缀配置

3. **与插件级自动注入的区别**：
   - 应用级：注册到 root container，全局可用
   - 插件级：注册到插件 SCOPED 容器，仅插件内可用

4. **配置选项**：
   - patterns: 自定义扫描模式
   - routing.enabled: 是否启用路由注册
   - routing.prefix: 路由前缀
   - routing.validation: 是否启用验证
   - debug: 调试模式

5. **最佳实践**：
   - 应用级模块用于核心业务逻辑
   - 插件级模块用于特定功能域
   - 避免循环依赖
   - 使用接口抽象依赖关系
*/

if (require.main === module) {
  main();
}
