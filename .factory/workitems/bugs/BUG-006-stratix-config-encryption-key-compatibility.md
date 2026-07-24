# BUG-006 Stratix 配置加密密钥兼容

- 类型：BUG
- 状态：CLOSED
- 优先级：P0
- 阶段：POST_RELEASE_CONSUMER_REMEDIATION
- 日期：2026-07-24

## 现象

`@stratix/forge` 通过 `STRATIX_ENCRYPTION_KEY` 加密配置后，`@stratix/core`
启动期读取同一环境变量解密 `STRATIX_SENSITIVE_CONFIG`，AES-256-GCM 报错：

```text
JSON 配置解密失败: Unsupported state or unable to authenticate data
```

## 独立复现

1. 构建当前工作区的 `@stratix/forge` 与 `@stratix/core`。
2. 设置一个恰好 32-byte 的 `STRATIX_ENCRYPTION_KEY`。
3. 真实执行 Forge CLI `config encrypt`，不传 `--key`，输出 `.env`。
4. 保留同一环境变量，把 `.env` 中的 `STRATIX_SENSITIVE_CONFIG` 交给 Core
   `decryptConfig()`。

结果：Core 稳定复现 AES-GCM 认证失败。对照实验只把 Forge 的 key 来源改成
显式传入同一 32-byte 值，Core 解密成功。

## 调用链与根因

- Forge CLI `config encrypt/decrypt` 都调用
  `packages/forge/src/utils/config-crypto.ts`。
- Core 启动期 `ApplicationBootstrap.loadEnvironment()` 调用
  `packages/core/src/utils/crypto.ts` 的 `decryptConfig()`。
- Forge 的 `getEncryptionKey()` 对环境变量无条件执行 SHA-256；显式 32-byte key
  保留原值。
- Core 的 `getEncryptionKey()` 对环境变量与显式 key 都直接使用原始 bytes。

直接原因：相同环境变量在 Forge 中成为 SHA-256 digest，在 Core 中仍是原始
32 bytes，AES-GCM 解密 key 不同。

根源原因：Forge 与 Core 各自实现密钥解析，却没有共享契约或跨包往返测试；
Forge 自身 encrypt/decrypt 测试使用同一套错误归一化，因此无法发现不兼容。

## 修复边界

- 环境变量与显式 key 使用同一解析契约。
- AES-256 key 解析后必须严格为 32 bytes。
- Forge CLI 只从环境变量读取 key，不把 key 放入命令行参数。
- 不修改消费项目 `node_modules`。
- 不做双 key 猜测、旧 key 重试或降级解密。
- 增加 Forge CLI -> env artifact -> Core decrypt 的跨包回归测试。

## 兼容影响

Forge 旧环境变量路径使用 SHA-256 digest。按新契约修复后，由该旧路径生成的
既有密文不能直接解密；必须在升级前用旧 Forge 配置解密流程导出明文，再用
新版本和新契约重新加密。原先使用 `--key` 的脚本也必须改为注入
`STRATIX_ENCRYPTION_KEY`。修复不会静默尝试旧 key，以免掩盖错误配置。

| 既有密文来源                                | 修复后兼容性                        |
| ------------------------------------------- | ----------------------------------- |
| Forge 显式恰好 32-byte key                  | 兼容                                |
| Core 恰好 32-byte key                       | 兼容                                |
| Forge 环境变量 key（旧 SHA-256 路径）       | 不兼容，需用旧 Forge 解密后重新加密 |
| Forge 显式非 32-byte key（旧 SHA-256 路径） | 不兼容，需用旧 Forge 解密后重新加密 |

## 修复

- Forge 与 Core 对原始 32-byte、64 位 hex、标准 base64 key 使用同一确定性
  解析规则，解析后严格校验为 32 bytes。
- Forge CLI `config encrypt/decrypt` 拒绝 `--key`，只从
  `STRATIX_ENCRYPTION_KEY` 读取 key。
- `config generate-key` 只允许生成 32-byte AES-256 key。
- 跨包回归测试覆盖 Forge CLI 生成 key、通过环境变量加密到 `.env`、Core
  解密产物，以及 Forge 显式 key 对照路径。
- 未加入旧 key 重试、双 key 猜测或降级解密。

## Red-Green 与验证

- RED：跨包定向测试 `1` 个失败，错误为
  `Unsupported state or unable to authenticate data`。
- GREEN：同一定向测试通过；Core crypto 定向测试 `5/5` 通过。
- `pnpm --filter @stratix/forge test`：`70/70` 通过。
- `pnpm --filter @stratix/core test`：`34` 个文件、`263/263` 通过。
- Forge/Core `tsc -p tsconfig.json --noEmit`：通过。
- Forge/Core `pnpm run build`：通过。
- built Forge -> `.env` -> built Core 独立往返：通过。
- `@stratix/core@1.1.2`、`@stratix/create@1.1.2`、`@stratix/forge@1.1.4`
  已发布到本机配置的 Aliyun `@stratix` registry；精确版本和 `latest` dist-tag
  反查通过。
