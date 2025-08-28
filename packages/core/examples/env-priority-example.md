# 环境变量优先级覆盖示例

本示例演示了修改后的 `loadEnvironment` 方法如何实现按优先级顺序加载多个环境配置文件的功能。

## 功能特性

1. **按优先级顺序加载**：按以下顺序依次加载环境配置文件
2. **优先级覆盖机制**：后加载的文件中的配置项覆盖先加载文件中的同名配置项
3. **系统环境变量保护**：根据 `override` 参数决定是否覆盖系统环境变量
4. **变量扩展支持**：支持变量引用和扩展

## 加载顺序

```
.env                    # 基础配置（最低优先级）
.env.${env}            # 环境特定配置
.env.${env}.local      # 本地环境特定配置  
.env.local             # 本地通用配置（最高优先级）
```

## 示例文件结构

```
project-root/
├── .env                    # 基础配置
├── .env.development        # 开发环境配置
├── .env.development.local  # 开发环境本地配置
├── .env.production         # 生产环境配置
├── .env.local              # 本地通用配置
└── stratix.config.ts       # Stratix 配置文件
```

## 示例配置文件

### .env (基础配置)
```env
# 基础配置 - 最低优先级
APP_NAME=MyApp
PORT=3000
HOST=localhost
DATABASE_URL=postgres://user:pass@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### .env.development (开发环境配置)
```env
# 开发环境特定配置
PORT=3001
LOG_LEVEL=debug
DATABASE_URL=postgres://user:pass@localhost:5432/myapp_dev
ENABLE_DEBUG=true
```

### .env.development.local (开发环境本地配置)
```env
# 开发环境本地配置 - 不应提交到版本控制
DATABASE_URL=postgres://user:pass@localhost:5432/myapp_dev_local
REDIS_URL=redis://localhost:6380
API_KEY=dev-local-api-key
```

### .env.local (本地通用配置)
```env
# 本地通用配置 - 最高优先级，不应提交到版本控制
SECRET_KEY=local-secret-key
OVERRIDE_SETTING=local-value
```

## 优先级覆盖示例

假设 `NODE_ENV=development`，最终的环境变量值将是：

```env
APP_NAME=MyApp                                    # 来自 .env
PORT=3001                                         # 来自 .env.development (覆盖 .env)
HOST=localhost                                    # 来自 .env
DATABASE_URL=postgres://user:pass@localhost:5432/myapp_dev_local  # 来自 .env.development.local (覆盖前面的)
REDIS_URL=redis://localhost:6380                 # 来自 .env.development.local (覆盖前面的)
LOG_LEVEL=debug                                   # 来自 .env.development (覆盖 .env)
ENABLE_DEBUG=true                                 # 来自 .env.development
API_KEY=dev-local-api-key                         # 来自 .env.development.local
SECRET_KEY=local-secret-key                       # 来自 .env.local
OVERRIDE_SETTING=local-value                      # 来自 .env.local
```

## 变量扩展示例

```env
# .env
BASE_URL=https://api.example.com
API_VERSION=v1

# .env.development
BASE_URL=http://localhost:8080
API_ENDPOINT=${BASE_URL}/${API_VERSION}/users
DATABASE_NAME=myapp_${API_VERSION}_dev
```

最终结果：
```env
BASE_URL=http://localhost:8080                   # 开发环境覆盖基础配置
API_VERSION=v1                                   # 来自基础配置
API_ENDPOINT=http://localhost:8080/v1/users      # 变量扩展结果
DATABASE_NAME=myapp_v1_dev                       # 变量扩展结果
```

## 使用方式

```typescript
import { Stratix } from '@stratix/core';

// 启动应用时，环境变量会自动按优先级加载
const app = await Stratix.run({
  envOptions: {
    rootDir: process.cwd(),
    override: false,  // 不覆盖系统环境变量
    strict: true      // 严格模式，要求 .env 文件存在
  }
});
```

## 注意事项

1. **生产环境安全**：在生产环境中，`.local` 文件会被自动排除，避免安全风险
2. **文件不存在**：如果某个环境文件不存在，会跳过该文件继续处理其他文件
3. **解析错误**：如果某个文件解析失败，会记录警告但不会中断整个流程
4. **系统环境变量**：`override` 参数控制是否覆盖系统环境变量，默认为 `false`
5. **版本控制**：`.local` 文件不应提交到版本控制系统

## 最佳实践

1. **基础配置**：在 `.env` 中放置所有环境的通用配置和默认值
2. **环境特定**：在 `.env.${env}` 中放置特定环境的配置覆盖
3. **本地开发**：在 `.env.local` 和 `.env.${env}.local` 中放置本地开发配置
4. **敏感信息**：敏感信息应使用 Stratix 的加密配置功能，而不是明文存储
5. **文档化**：为每个配置项添加注释说明其用途和可能的值
