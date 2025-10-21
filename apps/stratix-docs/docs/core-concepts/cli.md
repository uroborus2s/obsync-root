---
sidebar_position: 7
---

# 命令行工具 (CLI)

`@stratix/core` 不仅仅是一个运行时框架，它还提供了一个强大的命令行工具（CLI）—— `stratix`，旨在简化开发流程并增强应用的安全性。这个工具专注于处理与配置相关的常见任务。

您可以通过 `npx` 直接运行它：

```bash
npx stratix --help
```

## 核心功能：`config`

所有与配置相关的功能都集中在 `config` 子命令下。

```bash
npx stratix config --help
```

### `config generate-key`

**用途**: 生成一个用于加密和解密配置的、高强度的安全密钥。

在部署生产应用时，您绝不应该将敏感信息（如数据库密码、API 密钥）以明文形式存储在代码库或配置文件中。第一步就是创建一个安全的密钥。

**命令**:

```bash
npx stratix config generate-key
```

**输出示例**:

```
🔑 正在生成安全密钥...
✅ 密钥生成成功

🔑 生成的密钥:
5f8d...[a long hex string]...c1e7

💡 设置环境变量:
export STRATIX_ENCRYPTION_KEY="5f8d...c1e7"
```

**最佳实践**: 
1. 运行此命令一次。
2. 将生成的密钥存储在一个安全的地方，例如您服务器提供商的环境变量配置中，变量名为 `STRATIX_ENCRYPTION_KEY`。
3. **不要**将此密钥提交到您的代码库中。

### `config encrypt`

**用途**: 加密一个包含敏感信息的 JSON 文件。

**流程**:

1.  **创建敏感信息文件**: 将所有敏感信息放入一个临时的 JSON 文件，例如 `secrets.json`。

    ```json title="secrets.json"
    {
      "DB_PASSWORD": "my-super-secret-password!@#",
      "STRIPE_API_KEY": "sk_test_...",
      "JWT_SECRET": "a-very-long-and-random-jwt-secret"
    }
    ```

2.  **运行加密命令**: 确保您已经设置了 `STRATIX_ENCRYPTION_KEY` 环境变量，然后运行加密命令。

    ```bash
    npx stratix config encrypt secrets.json
    ```

3.  **获取加密字符串**: 命令会输出一个长长的加密字符串。

    ```
    🔐 正在加密配置文件...
    ✅ 配置加密成功

    🔐 加密后的配置:
    [a very long encrypted string]

    💡 设置环境变量:
    export STRATIX_SENSITIVE_CONFIG="[a very long encrypted string]"
    ```

4.  **清理与配置**: 
    - **立即删除 `secrets.json` 文件！**
    - 将输出的加密字符串设置为您服务器上的另一个环境变量 `STRATIX_SENSITIVE_CONFIG`。

当您的 `@stratix/core` 应用启动时，它会自动检测 `STRATIX_SENSITIVE_CONFIG` 变量，并使用 `STRATIX_ENCRYPTION_KEY` 对其进行解密，然后将解密后的对象安全地传递给您的配置文件函数。详情请参考 [启动与配置](./bootstrap-config.md#敏感配置加密)。

### `config decrypt`

**用途**: 用于调试或验证，解密一个由 `encrypt` 命令生成的字符串。

如果您需要确认一个加密字符串的内容是否正确，可以使用此命令。

**命令**:

```bash
# 确保 STRATIX_ENCRYPTION_KEY 环境变量已设置
npx stratix config decrypt "<your-encrypted-string>"
```

**输出示例**:

```
🔓 正在解密配置...
✅ 配置解密成功

📋 解密后的配置:
{
  "DB_PASSWORD": "my-super-secret-password!@#",
  "STRIPE_API_KEY": "sk_test_...",
  "JWT_SECRET": "a-very-long-and-random-jwt-secret"
}
```

### `config validate`

**用途**: 验证一个 JSON 配置文件的结构是否符合要求。

**命令**:

```bash
# 验证 config.json 文件是否包含 "database" 和 "api" 这两个顶级键
npx stratix config validate config.json --required "database,api"
```

这个工具可以集成到您的 CI/CD 流程中，以确保配置文件的基本结构是正确的，防止因配置错误导致的部署失败。
