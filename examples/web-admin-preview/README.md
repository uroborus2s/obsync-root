# 幻廊之镜预览样例

这是一个由仓库内 `@stratix/cli` 生成的“幻廊之镜”(`web-admin`) 预览样例。

## 定位

- 用途：手动预览 CLI 模板输出
- 边界：不属于 root workspace，不参与公共包发布
- 来源命令：

```bash
mkdir -p examples
cd examples
node ../packages/cli/dist/bin/stratix.js init app web-admin web-admin-preview --no-install
```

## 本地运行

在本目录下执行：

```bash
pnpm install --ignore-workspace
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

## 已验证事实

- 2026-03-28 已验证 `install`、`build`、`test`、`preview`
- 预览地址：`http://127.0.0.1:4273/`
