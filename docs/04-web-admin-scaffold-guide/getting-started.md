# 快速开始

## 模板定位

“幻廊之镜”是 `@stratix/cli` 提供的后台管理前端脚手架，对应模板类型为 `web-admin`，模板清单位于：

- `packages/cli/templates/apps/web-admin/manifest.json`

模板特点：

- 基于 Vite
- 使用 React 19
- 使用 TanStack Router / Query / Table
- 内置 shadcn/ui 风格的基础组件层
- 允许组合 `admin-mock`、`testing` preset

## 创建项目

```bash
stratix init app web-admin my-admin
```

仓库内现成的“幻廊之镜”预览样例位于：

- `examples/web-admin-preview`

## 本地运行

在脚手架目录下执行：

```bash
pnpm install --ignore-workspace
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

说明：

- `--ignore-workspace` 用于把样例当作独立前端工程恢复依赖。
- 仓库内 `examples/web-admin-preview` 已验证可以完成“幻廊之镜”样例的安装、构建和预览。
