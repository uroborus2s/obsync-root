# 环境变量优先级覆盖功能实现

## 概述

本文档描述了对 `packages/core/src/bootstrap/application-bootstrap.ts` 文件中 `loadEnvironment` 方法的修改，以实现按优先级顺序加载多个环境配置文件的功能。

## 问题分析

### 原有问题

1. **错误理解 `override` 参数**：原实现中的 `dotenv.config({ override })` 参数控制的是是否覆盖系统环境变量，而不是文件间的优先级覆盖。

2. **缺乏真正的优先级覆盖**：每次调用 `dotenv.config()` 都是独立的，无法实现后加载的文件覆盖先加载文件中的同名配置项。

3. **变量扩展时机不当**：在每个文件加载后立即进行变量扩展，可能导致引用关系混乱。

### 需求规格

1. **加载顺序**：按以下优先级顺序依次加载环境配置文件：
   ```
   .env                    # 基础配置（最低优先级）
   .env.${env}            # 环境特定配置
   .env.${env}.local      # 本地环境特定配置  
   .env.local             # 本地通用配置（最高优先级）
   ```

2. **优先级覆盖**：后加载的文件中的配置项应该覆盖先加载文件中的同名配置项。

3. **系统环境变量保护**：根据 `override` 参数决定是否覆盖系统环境变量。

## 实现方案

### 核心修改

修改了 `loadEnvironment` 方法中第378-429行的环境文件加载逻辑：

#### 1. 收集环境变量

```typescript
// 收集所有环境变量，实现正确的优先级覆盖
const allEnvVars: Record<string, string> = {};
```

#### 2. 按优先级解析文件

```typescript
// 按优先级顺序解析文件（从低到高优先级）
// 后加载的文件中的配置项会覆盖先加载文件中的同名配置项
for (const filePath of filesToLoad) {
  if (!fs.existsSync(filePath)) {
    this.logger.debug(`环境变量文件不存在: ${filePath}`);
    continue;
  }

  try {
    this.logger.debug(`解析环境变量文件: ${filePath}`);
    
    // 读取文件内容并解析
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = dotenv.parse(fileContent);
    
    // 记录解析结果
    const parsedCount = Object.keys(parsed).length;
    this.logger.debug(`从 ${filePath} 解析到 ${parsedCount} 个变量`);
    
    // 合并到总配置中，后加载的覆盖先加载的
    // 这里实现了真正的优先级覆盖机制
    Object.assign(allEnvVars, parsed);
    
  } catch (error) {
    this.logger.warn(`解析环境变量文件失败: ${filePath}`, error);
    // 继续处理其他文件，不中断整个流程
  }
}
```

#### 3. 设置环境变量

```typescript
// 设置到 process.env，根据 override 参数决定是否覆盖系统环境变量
for (const [key, value] of Object.entries(allEnvVars)) {
  if (override || !(key in process.env)) {
    process.env[key] = value;
  }
}
```

#### 4. 统一变量扩展

```typescript
// 在所有文件解析完成后，统一进行变量扩展
// 这样可以确保变量引用关系的正确性
const expandResult = dotenvExpand.expand({ parsed: allEnvVars });

if (expandResult.error) {
  this.logger.warn('变量扩展过程中出现错误:', expandResult.error);
} else {
  this.logger.debug('变量扩展完成');
}
```

### 关键改进

1. **使用 `dotenv.parse()` 替代 `dotenv.config()`**：
   - `dotenv.parse()` 只解析文件内容，不直接设置到 `process.env`
   - 允许手动控制合并和覆盖逻辑

2. **手动实现优先级覆盖**：
   - 使用 `Object.assign(allEnvVars, parsed)` 实现后加载覆盖先加载
   - 确保 `.env.local` 文件具有最高优先级

3. **分离系统环境变量处理**：
   - 先收集所有文件的配置
   - 再根据 `override` 参数决定是否覆盖系统环境变量

4. **统一变量扩展**：
   - 在所有文件解析完成后统一进行变量扩展
   - 避免变量引用关系混乱

## 功能特性

### 1. 优先级覆盖示例

假设有以下文件内容：

```env
# .env
APP_NAME=MyApp
PORT=3000
DATABASE_URL=postgres://localhost/myapp

# .env.development  
PORT=3001
DATABASE_URL=postgres://localhost/myapp_dev
DEBUG=true

# .env.development.local
DATABASE_URL=postgres://localhost/myapp_dev_local
API_KEY=dev-local-key

# .env.local
SECRET_KEY=local-secret
```

最终结果（`NODE_ENV=development`）：
```env
APP_NAME=MyApp                                           # 来自 .env
PORT=3001                                               # 来自 .env.development (覆盖 .env)
DATABASE_URL=postgres://localhost/myapp_dev_local       # 来自 .env.development.local (覆盖前面的)
DEBUG=true                                              # 来自 .env.development
API_KEY=dev-local-key                                   # 来自 .env.development.local
SECRET_KEY=local-secret                                 # 来自 .env.local
```

### 2. 系统环境变量保护

- `override=false`（默认）：不覆盖系统环境变量
- `override=true`：覆盖系统环境变量

### 3. 生产环境安全

在生产环境中，`.local` 文件会被自动排除，避免安全风险。

### 4. 错误处理

- 文件不存在：跳过该文件，继续处理其他文件
- 解析失败：记录警告，继续处理其他文件
- 变量扩展失败：记录警告，不中断流程

## 测试验证

创建了以下测试文件来验证功能：

1. **单元测试**：`packages/core/src/__tests__/env-priority.test.ts`
2. **示例文档**：`packages/core/examples/env-priority-example.md`
3. **验证脚本**：`packages/core/examples/simple-env-test.js`

## 向后兼容性

此修改完全向后兼容：

1. **API 不变**：`loadEnvironment` 方法的签名和调用方式保持不变
2. **配置不变**：`EnvOptions` 接口保持不变
3. **行为增强**：只是增强了优先级覆盖功能，不影响现有功能

## 使用方式

```typescript
import { Stratix } from '@stratix/core';

const app = await Stratix.run({
  envOptions: {
    rootDir: process.cwd(),
    override: false,  // 不覆盖系统环境变量
    strict: true      // 严格模式
  }
});
```

## 最佳实践

1. **基础配置**：在 `.env` 中放置通用配置和默认值
2. **环境特定**：在 `.env.${env}` 中放置特定环境的配置覆盖
3. **本地开发**：在 `.env.local` 和 `.env.${env}.local` 中放置本地开发配置
4. **版本控制**：`.local` 文件不应提交到版本控制系统
5. **敏感信息**：使用 Stratix 的加密配置功能，而不是明文存储

## 总结

此次修改成功实现了按优先级顺序加载多个环境配置文件的功能，解决了原有实现中的优先级覆盖问题，提供了更灵活和可靠的环境变量管理机制。
