// 装饰器编译过程详解示例
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
// ===== 1. TypeScript 源代码阶段 =====
// 装饰器定义
function Controller(path) {
    console.log(`🔧 Controller 装饰器被调用: ${path}`);
    return function (target) {
        console.log(`📝 应用 Controller 装饰器到: ${target.name}`);
        target.routePath = path;
        target.isController = true;
        return target;
    };
}
function Get(path) {
    console.log(`🔧 Get 装饰器被调用: ${path}`);
    return function (target, propertyKey, descriptor) {
        console.log(`📝 应用 Get 装饰器到: ${target.constructor.name}.${propertyKey}`);
        if (!target.constructor.routes) {
            target.constructor.routes = [];
        }
        target.constructor.routes.push({
            method: 'GET',
            path: path,
            handler: propertyKey
        });
        return descriptor;
    };
}
function Service() {
    console.log(`🔧 Service 装饰器被调用`);
    return function (target) {
        console.log(`📝 应用 Service 装饰器到: ${target.name}`);
        target.isService = true;
        return target;
    };
}
// ===== 2. 使用装饰器的类 =====
let UserController = class UserController {
    getUsers() {
        return { users: [] };
    }
    getUserById(id) {
        return { user: { id } };
    }
};
__decorate([
    Get('/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserController.prototype, "getUsers", null);
__decorate([
    Get('/:id'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "getUserById", null);
UserController = __decorate([
    Controller('/api/users')
], UserController);
let UserService = class UserService {
    findAll() {
        return [];
    }
    findById(id) {
        return { id };
    }
};
UserService = __decorate([
    Service()
], UserService);
// ===== 3. 编译时机演示 =====
export function demonstrateCompilationTiming() {
    console.log('=== 装饰器编译时机演示 ===\n');
    console.log('1. TypeScript 编译阶段:');
    console.log('   - 装饰器语法被解析');
    console.log('   - 装饰器函数被调用');
    console.log('   - 元数据被附加到类/方法上');
    console.log('   - 生成等效的 JavaScript 代码');
    console.log('\n2. 运行时阶段:');
    console.log('   - JavaScript 引擎执行编译后的代码');
    console.log('   - 装饰器效果已经应用');
    console.log('   - 元数据可以通过类构造函数访问');
    console.log('\n3. 动态导入阶段:');
    console.log('   - import() 加载已编译的 JavaScript 模块');
    console.log('   - 装饰器元数据仍然存在');
    console.log('   - 可以正常访问和使用');
}
// ===== 4. 编译后的效果检查 =====
export function checkCompiledDecorators() {
    console.log('\n=== 编译后装饰器效果检查 ===\n');
    // 检查类装饰器效果
    console.log('UserController 类装饰器效果:');
    console.log('  - isController:', UserController.isController);
    console.log('  - routePath:', UserController.routePath);
    console.log('  - routes:', UserController.routes);
    console.log('\nUserService 类装饰器效果:');
    console.log('  - isService:', UserService.isService);
    // 检查方法装饰器效果
    console.log('\n方法装饰器效果:');
    const routes = UserController.routes || [];
    routes.forEach((route, index) => {
        console.log(`  Route ${index + 1}:`, route);
    });
}
// ===== 5. 模拟编译过程 =====
export function simulateCompilationProcess() {
    console.log('\n=== 模拟编译过程 ===\n');
    console.log('步骤 1: TypeScript 解析装饰器语法');
    console.log('  @Controller("/api/users") -> Controller("/api/users")');
    console.log('  @Get("/list") -> Get("/list")');
    console.log('\n步骤 2: 生成装饰器调用代码');
    console.log('  UserController = Controller("/api/users")(UserController)');
    console.log('  Get("/list")(UserController.prototype, "getUsers", descriptor)');
    console.log('\n步骤 3: 执行装饰器函数');
    console.log('  - Controller 装饰器修改 UserController 类');
    console.log('  - Get 装饰器修改 getUsers 方法');
    console.log('\n步骤 4: 生成最终的 JavaScript 代码');
    console.log('  - 类定义保持不变');
    console.log('  - 元数据已附加到类/方法上');
    console.log('  - 装饰器语法被移除');
}
// ===== 6. 不同编译配置的影响 =====
export function explainCompilerOptions() {
    console.log('\n=== TypeScript 编译配置对装饰器的影响 ===\n');
    console.log('tsconfig.json 相关配置:');
    console.log(`
{
  "compilerOptions": {
    "experimentalDecorators": true,     // 启用装饰器支持
    "emitDecoratorMetadata": true,      // 生成装饰器元数据
    "target": "ES2020",                 // 目标 JavaScript 版本
    "module": "ESNext",                 // 模块系统
    "moduleResolution": "node"          // 模块解析策略
  }
}
  `);
    console.log('配置说明:');
    console.log('  - experimentalDecorators: 必须启用，否则装饰器语法报错');
    console.log('  - emitDecoratorMetadata: 生成类型元数据（用于依赖注入）');
    console.log('  - target: 影响生成的 JavaScript 代码风格');
    console.log('  - module: 影响模块导入/导出的处理方式');
}
// ===== 7. 运行时 vs 编译时对比 =====
export function compareRuntimeVsCompileTime() {
    console.log('\n=== 运行时 vs 编译时对比 ===\n');
    console.log('编译时（TypeScript -> JavaScript）:');
    console.log('  ✅ 装饰器语法被处理');
    console.log('  ✅ 装饰器函数被调用');
    console.log('  ✅ 元数据被附加');
    console.log('  ✅ 类型检查');
    console.log('  ❌ 无法访问运行时数据');
    console.log('\n运行时（JavaScript 执行）:');
    console.log('  ✅ 可以访问装饰器元数据');
    console.log('  ✅ 可以创建类实例');
    console.log('  ✅ 可以调用方法');
    console.log('  ✅ 可以进行动态操作');
    console.log('  ❌ 装饰器语法已不存在');
    console.log('\n动态导入时:');
    console.log('  ✅ 加载编译后的 JavaScript');
    console.log('  ✅ 装饰器元数据完整保留');
    console.log('  ✅ 可以正常使用类和方法');
    console.log('  ✅ 支持依赖注入');
}
// ===== 8. 实际编译示例 =====
export function showActualCompiledCode() {
    console.log('\n=== 实际编译后的代码示例 ===\n');
    console.log('TypeScript 源码:');
    console.log(`
@Controller('/api/users')
class UserController {
  @Get('/list')
  getUsers() {
    return [];
  }
}
  `);
    console.log('编译后的 JavaScript (简化版):');
    console.log(`
var __decorate = function (decorators, target, key, desc) {
  // 装饰器处理逻辑
};

let UserController = class UserController {
  getUsers() {
    return [];
  }
};

// 类装饰器应用
UserController = __decorate([
  Controller('/api/users')
], UserController);

// 方法装饰器应用
__decorate([
  Get('/list')
], UserController.prototype, "getUsers", null);
  `);
    console.log('关键点:');
    console.log('  1. 装饰器语法被转换为函数调用');
    console.log('  2. __decorate 是 TypeScript 生成的辅助函数');
    console.log('  3. 装饰器在模块加载时立即执行');
    console.log('  4. 元数据被永久附加到类/方法上');
}
// 运行所有示例
export function runAllExamples() {
    demonstrateCompilationTiming();
    checkCompiledDecorators();
    simulateCompilationProcess();
    explainCompilerOptions();
    compareRuntimeVsCompileTime();
    showActualCompiledCode();
}
// 如果直接运行此文件
if (require.main === module) {
    runAllExamples();
}
//# sourceMappingURL=decorator-compilation-process.js.map