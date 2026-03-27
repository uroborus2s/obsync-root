# 快速开始

## 适用版本

- `@stratix/cli@1.1.0`
- `@stratix/core@1.1.0`
- `@stratix/database@1.1.0`

## 推荐起步方式

优先使用 CLI，而不是手工创建目录和样板。

```bash
stratix init app api my-app
cd my-app
stratix doctor
```

如果应用需要数据库能力，再注入对应 preset：

```bash
stratix add preset database
```

如果要新增标准业务层，优先生成资源而不是手写空目录：

```bash
stratix generate resource user
```

## 应用入口

后端应用默认关注两个入口文件：

- `src/index.ts`
- `src/stratix.config.ts`

其中：

- `src/index.ts` 负责应用启动。
- `src/stratix.config.ts` 负责插件和运行时配置。

## 日常验证

建议把下面几个命令作为日常最小验证链：

```bash
stratix doctor
pnpm build
pnpm test
```

如果有配置加密需求，优先使用 CLI 的 `stratix config encrypt|decrypt|validate|generate-key`。
