// 动态导入与装饰器处理示例
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { isClass } from 'awilix';
// 模拟装饰器
function Controller(path) {
    return function (target) {
        target.routePath = path;
        target.isController = true;
        return target;
    };
}
function Service() {
    return function (target) {
        target.isService = true;
        return target;
    };
}
// 示例类（使用装饰器）
let UserController = class UserController {
    getUsers() {
        return { users: [] };
    }
};
UserController = __decorate([
    Controller('/api/users')
], UserController);
let UserService = class UserService {
    findAll() {
        return [];
    }
};
UserService = __decorate([
    Service()
], UserService);
// 默认导出的类
let ProductController = class ProductController {
    getProducts() {
        return { products: [] };
    }
};
ProductController = __decorate([
    Controller('/api/products')
], ProductController);
export default ProductController;
// 命名导出的类
let ProductService = class ProductService {
    findAll() {
        return [];
    }
};
ProductService = __decorate([
    Service()
], ProductService);
export { ProductService };
// 动态导入处理函数
export async function handleDynamicImport(modulePath, moduleName) {
    console.log(`=== 处理动态导入: ${moduleName} ===`);
    try {
        // 1. 动态导入模块
        const moduleExport = await import(modulePath);
        console.log('模块导出:', Object.keys(moduleExport));
        // 2. 获取实际的类构造函数
        let ClassConstructor = moduleExport.default || moduleExport[moduleName];
        // 3. 如果都没找到，尝试查找第一个类导出
        if (!ClassConstructor) {
            for (const [key, value] of Object.entries(moduleExport)) {
                if (typeof value === 'function' &&
                    value.prototype &&
                    value.prototype.constructor === value) {
                    console.log(`找到类导出: ${key}`);
                    ClassConstructor = value;
                    break;
                }
            }
        }
        // 4. 验证是否是类构造函数
        if (ClassConstructor && typeof ClassConstructor === 'function') {
            if (isClass(ClassConstructor)) {
                console.log('✅ 找到有效的类构造函数');
                // 5. 检查装饰器元数据
                console.log('装饰器元数据:');
                console.log('  - isController:', ClassConstructor.isController);
                console.log('  - isService:', ClassConstructor.isService);
                console.log('  - routePath:', ClassConstructor.routePath);
                // 6. 创建实例测试
                const instance = new ClassConstructor();
                console.log('实例创建成功:', instance.constructor.name);
                return {
                    success: true,
                    ClassConstructor,
                    metadata: {
                        isController: ClassConstructor.isController,
                        isService: ClassConstructor.isService,
                        routePath: ClassConstructor.routePath
                    }
                };
            }
            else {
                console.log('⚠️ 不是类构造函数');
                return { success: false, reason: 'Not a class constructor' };
            }
        }
        else {
            console.log('⚠️ 没有找到有效的类');
            return { success: false, reason: 'No valid class found' };
        }
    }
    catch (error) {
        console.error('❌ 动态导入失败:', error);
        return { success: false, reason: error.message };
    }
}
// 模拟模块导出处理
export function simulateModuleExports() {
    console.log('=== 模拟不同的模块导出情况 ===\n');
    // 情况 1: 默认导出
    console.log('1. 默认导出:');
    const defaultExportModule = {
        default: UserController
    };
    const defaultClass = defaultExportModule.default;
    console.log('  - 类名:', defaultClass.name);
    console.log('  - 是否是类:', isClass(defaultClass));
    console.log('  - 装饰器元数据:', {
        isController: defaultClass.isController,
        routePath: defaultClass.routePath
    });
    // 情况 2: 命名导出
    console.log('\n2. 命名导出:');
    const namedExportModule = {
        UserService: UserService,
        ProductService: ProductService
    };
    for (const [name, ClassConstructor] of Object.entries(namedExportModule)) {
        console.log(`  - ${name}:`);
        console.log('    - 是否是类:', isClass(ClassConstructor));
        console.log('    - 装饰器元数据:', {
            isService: ClassConstructor.isService
        });
    }
    // 情况 3: 混合导出
    console.log('\n3. 混合导出:');
    const mixedExportModule = {
        default: ProductController,
        ProductService: ProductService,
        someFunction: () => { },
        someValue: 'test'
    };
    console.log('  - 导出项:', Object.keys(mixedExportModule));
    // 查找类导出
    const classes = [];
    for (const [key, value] of Object.entries(mixedExportModule)) {
        if (typeof value === 'function' && isClass(value)) {
            classes.push({ name: key, constructor: value });
        }
    }
    console.log('  - 找到的类:', classes.map(c => c.name));
    // 情况 4: 装饰器元数据保留测试
    console.log('\n4. 装饰器元数据保留测试:');
    // 创建实例并检查装饰器是否仍然有效
    const userController = new UserController();
    const userService = new UserService();
    console.log('  - UserController 实例:', {
        className: userController.constructor.name,
        isController: userController.constructor.isController,
        routePath: userController.constructor.routePath
    });
    console.log('  - UserService 实例:', {
        className: userService.constructor.name,
        isService: userService.constructor.isService
    });
}
// 实际的动态导入测试
export async function testDynamicImportWithDecorators() {
    console.log('=== 动态导入装饰器测试 ===\n');
    // 注意：在实际环境中，这些路径应该指向真实的模块文件
    const testCases = [
        { name: 'UserController', path: './user.controller.js' },
        { name: 'ProductService', path: './product.service.js' }
    ];
    for (const testCase of testCases) {
        console.log(`测试: ${testCase.name}`);
        // 在实际环境中，这里会进行真正的动态导入
        // const result = await handleDynamicImport(testCase.path, testCase.name);
        // 模拟结果
        console.log('  ✅ 模拟成功加载');
        console.log('  📝 装饰器元数据已保留');
        console.log('  🔧 已注册到 DI 容器\n');
    }
}
// 最佳实践建议
export function bestPracticesForDynamicImportWithDecorators() {
    console.log('=== 动态导入与装饰器的最佳实践 ===\n');
    console.log('1. 模块导出规范:');
    console.log('   - 优先使用默认导出 (export default class)');
    console.log('   - 类名应与文件名匹配');
    console.log('   - 避免在同一文件中导出多个类');
    console.log('\n2. 装饰器使用:');
    console.log('   - 装饰器在编译时应用，运行时仍然有效');
    console.log('   - 元数据会附加到类构造函数上');
    console.log('   - 可以通过 ClassConstructor.metadata 访问');
    console.log('\n3. 错误处理:');
    console.log('   - 检查模块是否成功导入');
    console.log('   - 验证导出的是否为类构造函数');
    console.log('   - 处理装饰器元数据缺失的情况');
    console.log('\n4. 性能优化:');
    console.log('   - 缓存已导入的模块');
    console.log('   - 延迟加载非关键模块');
    console.log('   - 使用 Tree Shaking 减少包大小');
}
// 运行示例
if (require.main === module) {
    simulateModuleExports();
    console.log('\n' + '='.repeat(50) + '\n');
    testDynamicImportWithDecorators();
    console.log('\n' + '='.repeat(50) + '\n');
    bestPracticesForDynamicImportWithDecorators();
}
//# sourceMappingURL=dynamic-import-decorators-example.js.map