# 开发工作流

这篇文档讲的是“写一个新功能时，推荐按什么顺序推进”。重点不是术语，而是减少你一次改太多地方导致排错困难。

## 1. 最推荐的推进顺序

新增后台功能时，建议固定按下面顺序走：

1. 先选一个最接近的现成模块做参考
2. 先做页面骨架
3. 再接路由
4. 再加左侧菜单
5. 页面能打开后，再补数据层
6. 最后再做表单、抽屉、详情和复杂交互
7. 用统一命令验收

这个顺序的核心目的，是把问题一层层拆开。

## 2. 第一步先判断：你要做的是哪一类页面

开始前先做一个简单判断：

| 页面类型 | 先参考什么 | 典型场景 |
|---|---|---|
| 静态或轻交互页面 | `dashboard`、`settings` | 首页、说明页、配置页 |
| 列表或报表页 | `reports`、`components/admin/data-table/` | 报表、统计、只读列表 |
| CRUD 页面 | `features/users/` | 用户、客户、订单、商品、任务 |

不要从空白文件硬写。先复制最接近的示例，再替换业务名词，效率最高，出错也最少。

## 3. 一个新功能最小需要改哪些地方

最小闭环通常至少改这三处：

1. `src/features/.../pages/...`: 写页面
2. `src/routes/_authenticated/...`: 注册路由
3. `src/app/config/navigation.ts`: 加菜单

很多初学者一上来就想做 API、表单、权限和样式优化，但如果这三处没打通，后面工作都会叠加在错误基础上。

## 4. 数据层什么时候开始接

等到下面三件事都成立后，再接数据层：

- 页面能打开
- 菜单能进入
- 页面骨架已经能展示本地 mock 数据

这时再继续做：

1. 在 `src/features/<feature>/api/` 新建接口封装
2. 在 `src/features/<feature>/hooks/` 封装 query / mutation
3. 在 `src/features/<feature>/lib/` 放 schema、search 参数和工具函数
4. 需要 mock 时，在 `src/features/<feature>/data/` 放本地数据

## 5. UI 约束

- 优先复用 `src/components/ui/` 里的基础组件。
- 优先复用 `src/components/admin/` 里的后台外壳和表格能力。
- feature 专属组件放在 `src/features/<feature>/components/`。
- 不要手改 `src/routeTree.gen.ts`。
- 不要先重写全局布局，先把业务页跑通。

## 6. 写一个页面时的实用检查单

每次做新页面，至少按下面顺序自查一次：

1. 页面标题和说明是否清楚
2. 路由文件是否已创建
3. `navigation.ts` 是否已有菜单入口
4. 页面是否能通过菜单进入
5. 页面是否有最小 mock 数据或空状态
6. 是否已经复用现有组件，而不是重复造轮子

## 7. 验收命令

每次修改脚手架模板或生成结果后，至少执行：

```bash
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

如果你验证的是 CLI 模板本身，而不是某个业务项目，还应该同时检查这三处是否一致：

- `packages/cli/templates/apps/web-admin/manifest.json`
- `packages/cli/templates/apps/web-admin/files/`
- `examples/web-admin-preview/`

## 8. 下一步建议

如果你现在就想照着做一个新业务页，直接继续看：

- [从零做一个业务页](./build-your-first-app.md)
