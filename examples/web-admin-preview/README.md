# 幻廊之镜预览样例

这是一个由仓库内 `@stratix/create` 生成的“幻廊之镜”(`web-admin`) 预览样例。

## 定位

- 用途：手动预览 CLI 模板输出
- 边界：不属于 root workspace，不参与公共包发布
- 来源命令：

```bash
mkdir -p examples
cd examples
node ../packages/create/dist/bin/create-stratix.js app web-admin web-admin-preview --no-install
```

## 本地运行

在本目录下执行：

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

## 已验证事实

- 2026-07-24 已验证 TypeScript 7 + Oxlint 下的 `install`、`build`、`lint`、`test`
- 预览地址：`http://127.0.0.1:4273/`
