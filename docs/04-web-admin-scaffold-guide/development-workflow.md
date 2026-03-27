# 开发工作流

## 扩展页面

新增后台页面时，优先沿着下面路径扩展：

1. 在 `src/routes/_authenticated/` 新增页面路由。
2. 在 `src/app/config/navigation.ts` 增加菜单项。
3. 在 `src/lib/api/` 补齐对应的数据访问封装。
4. 在 `src/components/shared/` 沉淀可复用页面片段。

## 扩展数据层

- 统一在 `src/lib/api/` 封装请求入口和错误处理。
- 查询缓存 key 统一维护在 `query-keys.ts`。
- 复杂表格页优先复用 TanStack Table / Virtual 的既有能力。

## UI 约束

- 优先复用 `components/ui/` 和 `components/shared/` 里的现有组件。
- 不要把一次性页面样式直接散落到多个页面文件里。
- 主题切换和全局 provider 保持在 `src/app/providers/`。

## 验收建议

每次修改脚手架模板或生成结果后，至少执行：

```bash
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

如果要验证 CLI 模板本身，而不是样例改动，应该同时检查：

- `packages/cli/templates/apps/web-admin/manifest.json`
- `packages/cli/templates/apps/web-admin/files/`
- `examples/web-admin-preview/`
