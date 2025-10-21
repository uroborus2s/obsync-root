---
sidebar_position: 1
---

# 启动与配置

`@stratix/core` 的启动过程被设计得既简单又灵活。`Stratix.run()` 函数是整个应用的入口，它负责协调环境加载、配置解析、依赖注入容器的建立以及 Fastify 实例的初始化。

## `Stratix.run(options)`

这是启动一个新应用最简单的方式。它接受一个 `StratixRunOptions` 对象来自定义启动行为。

```typescript title="src/main.ts"
import 'reflect-metadata';
import { Stratix } from '@stratix/core';

async function bootstrap() {
  const app = await Stratix.run({
    type: 'web',
    config: {
      // ... 您的配置
    },
  });
}

bootstrap();
```

### `StratixRunOptions`

| 选项 | 类型 | 描述 |
| :--- | :--- | :--- |
| `type` | `'web' \| 'cli' \| 'worker'` | 指定应用类型。默认为 `'web'`。 |
| `config` | `StratixConfig` | 直接传入一个配置对象，这会覆盖从文件中加载的配置。 |
| `configOptions` | `string \| ConfigOptions` | 指定配置文件的路径或加载选项。 |
| `envOptions` | `EnvOptions` | 自定义环境变量文件的加载行为。 |
| `logger` | `Logger \| LoggerConfig` | 提供一个自定义的 `pino` 日志实例或配置。 |
| `debug` | `boolean` | 是否启用调试模式，会输出更详细的日志。 |

## 配置文件

`@stratix/core` 支持通过文件进行配置。框架会自动在您的项目根目录下查找名为 `stratix.config.ts` (或 `.js`) 的文件。

一个典型的配置文件导出一个函数，该函数接收解密后的敏感配置作为参数，并返回配置对象。

```typescript title="stratix.config.ts"
import { defineConfig } from '@stratix/core';

// defineConfig 提供了类型提示
export default defineConfig((sensitiveConfig) => ({
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
  },
  applicationAutoDI: {
    enabled: true,
    patterns: ['src/**/*.service.ts', 'src/**/*.controller.ts'],
  },
  plugins: [
    // 在此配置您的插件
  ],
  // 从敏感配置中获取数据库密码
  database: {
    password: sensitiveConfig.DB_PASSWORD,
  },
}));
```

## 环境管理

框架会自动加载项目根目录下的 `.env` 文件，并支持环境优先级覆盖。

加载顺序（后面的会覆盖前面的）：

1.  `.env` - 基础配置
2.  `.env.{NODE_ENV}` - 例如 `.env.development` 或 `.env.production`
3.  `.env.local` - 本地通用配置
4.  `.env.{NODE_ENV}.local` - 例如 `.env.development.local`

> 在 `NODE_ENV=production` 环境中，所有 `.local` 文件都会被忽略。

### 变量扩展

您可以在 `.env` 文件中使用变量引用，框架会自动进行扩展。

```env title=".env"
BASE_URL=http://localhost:3000
API_ENDPOINT=${BASE_URL}/api/v1
```

## 敏感配置加密

为了避免将密码、API 密钥等敏感信息直接存储在代码库中，`@stratix/core` 提供了强大的 CLI 工具来管理加密配置。

**1. 生成密钥**

首先，生成一个用于加密和解密的密钥。执行以下命令，并将生成的密钥安全地存储起来（例如，作为服务器的环境变量 `STRATIX_ENCRYPTION_KEY`）。

```bash
npx stratix config generate-key
```

**2. 创建敏感信息文件**

创建一个临时的 JSON 文件，例如 `sensitive.json`，包含您的敏感信息。

```json title="sensitive.json"
{
  "DB_PASSWORD": "my-super-secret-password",
  "STRIPE_API_KEY": "sk_test_..."
}
```

**3. 加密文件**

使用 CLI 加密该文件。

```bash
npx stratix config encrypt sensitive.json
```

CLI 会输出一个长长的加密字符串。**请删除 `sensitive.json` 文件**，并将这个加密字符串设置为您服务器上的环境变量 `STRATIX_SENSITIVE_CONFIG`。

**4. 自动解密和使用**

当您的应用启动时，`@stratix/core` 会自动检测 `STRATIX_SENSITIVE_CONFIG` 环境变量。如果存在，它会使用 `STRATIX_ENCRYPTION_KEY` 对其进行解密，并将解密后的对象作为参数传递给 `stratix.config.ts` 中导出的函数。这样，您就可以安全地访问敏感信息，而无需将其硬编码在任何地方。
