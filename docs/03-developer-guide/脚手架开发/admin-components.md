# 管理后台公共组件与 TanStack 基础

后台采用现有 shadcn/ui 与语义样式 token。参考 ita-club 的字段布局与后台表格实践；业务数据、权限与提交逻辑仍留在 feature 中。

## 基础服务

| 基础 | 入口 | 职责 |
| --- | --- | --- |
| TanStack Router | `src/main.tsx`、`src/routes/` | 文件路由、登录布局、经过校验的 URL 查询参数 |
| TanStack Query | `src/app/query-client.ts`、`features/*/hooks/` | 请求缓存、加载/错误状态、mutation 与缓存失效 |
| TanStack Table | `components/admin/data-table/` | 排序、分页、选中行、列显隐、固定列和分组列 |
| TanStack Virtual | `DataTable` 的可选虚拟行 | 大量已加载行的可视区域渲染；不替代服务端分页 |
| TanStack Form | `components/shared/form/` | 类型化字段、Zod 校验、错误展示、提交状态 |

Form 统一使用 `@tanstack/react-form@1.33.2`（与参考项目一致），不再并存 React Hook Form。Router、Query、Table 保留原有接入，避免重建第二套基础服务。

## 公共组件

| 组件 | 使用方式 |
| --- | --- |
| `PageHeader` | `title`、`description`、`actions`，统一标题和操作布局 |
| `CreateButton` | 统一新建图标与按钮；页面决定权限、文案和点击或跳转 |
| `DataTable` | 基于 TanStack Table，传入 columns/data；业务 API 不放进表格 |
| `DataTablePagination` | 共用页容量、首页/上一页/下一页/末页，支持未知总量 |
| `DataTableColumnHeader` / `DataTableViewOptions` | 排序表头与列显示配置 |
| `DataTableText` | 长文本截断、完整内容 tooltip |
| `FilterBar` | 筛选区域与批量操作布局 |
| `FormFieldLayout` / `FieldGroup` | 标签、说明、错误与控件 id/ARIA 关联 |
| `FormDialog` | 居中表单、未保存关闭确认、提交锁、失败保留输入、错误焦点 |
| `ConfirmDialog` | 危险操作确认，实际 mutation 在页面层 |
| `EmptyState` / `ErrorState` | 空数据、错误与重试 |
| `DetailSheet` | 只读详情；不作为新建表单默认容器 |

## 分页和大表格

本地分页传入完整 `data` 即可。服务端分页传入当前页数据、真实 `rowCount`、受控 `pagination` / `onPaginationChange`；筛选与排序变化回第一页。用业务 id 作为 `getRowId`，避免翻页时选中行落到另一条记录上。

```tsx
<DataTable
  columns={columns}
  data={query.data?.items ?? []}
  getRowId={(row) => row.id}
  rowCount={query.data?.total ?? 0}
  pagination={pagination}
  onPaginationChange={onPaginationChange}
  isLoading={query.isPending}
  error={query.error?.message}
  onRetry={() => void query.refetch()}
/>
```

总量未知时不要编造 `rowCount`/`pageCount`。使用 `hasNextPage` 表达下一页是否可用；页码仅表示当前位置，不展示总页数或末页。游标由业务请求层管理，不能用页码计算出未经服务端提供的游标。

大量已加载记录使用相同组件的虚拟行模式：

```tsx
<DataTable columns={columns} data={rows} getRowId={(row) => row.id}
  virtualizeRows virtualHeight={480} enablePagination={false} />
```

`/table-demo` 提供 10,000 条确定性示例数据及分页/虚拟模式切换。列固定、列组展开、列显隐和长文本仍使用既有列定义。虚拟化减少 DOM 行数，数据加载成本仍由 API 分页或分批加载解决。

## 新建与编辑表单

- 简单表单使用 `FormDialog`，不要用 `FormSheet` 或侧栏。
- 复杂表单使用独立页面，提供返回列表入口，并将列表筛选、页码放在路由 search 中保留。
- 多阶段业务使用独立页面内的分步表单：每步校验并保留数据，最终校验全部字段；不要堆成长侧栏。
- `admin-page` 是页面骨架，尚未接线的新建按钮保持禁用；按业务接入弹窗或页面后启用。

`FormDialog` 已包含原生 `<form>`，内部放 `FieldGroup`，不要再嵌套 `<form>`。通过 `form.Subscribe` 订阅 dirty/submitting，提交回调返回 Promise；失败抛错让容器显示错误，成功后页面关闭弹窗。字段用 `FormFieldLayout` 提供的 id、aria-invalid、aria-describedby 绑定控件。下拉框将这些属性绑定到 SelectTrigger。

## 生成 CRUD

`stratix generate admin-crud project-member` 生成：路由及 search 校验、数据表格列与筛选、FormDialog、详情、Query hooks、API 适配层、Zod schema，以及可运行的契约测试。

- 列表 search 保存搜索、状态、排序、方向、页码与页容量；复制链接或刷新可以恢复。
- Query key 包含查询参数；新建、更新和批量变更后失效同资源缓存。
- 默认 API 通过既有 `apiClient` 的 mock 模式运行内存演示，刷新浏览器会重置数据；`VITE_API_MODE=http` 时调用真实 HTTP 端点。默认 mock 不代表后端持久化。
- 接真实 API 时，只替换 `features/<资源>/api/` 实现，保持类型契约；使用现有请求客户端接入认证和错误处理。服务端必须重新验证权限与数据。
- 生成后仍需把业务入口登记到 `src/app/config/navigation.ts`。

## 验证入口

生成项目运行 `pnpm test`、`pnpm typecheck`、`pnpm build`；新增路由首次类型检查前运行一次构建生成 routeTree。公共组件测试覆盖分页边界、虚拟行、表单校验、重复提交、脏表单关闭与失败保值。`admin-crud` 同时生成 URL 和 API 适配层行为测试。

实现参考：[TanStack Form 校验](https://tanstack.com/form/latest/docs/framework/react/guides/validation)、[shadcn TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form)、[TanStack Table 虚拟化](https://tanstack.com/table/v8/docs/guide/virtualization)。

## 1.2.0 升级边界

新项目使用 `@stratix/create@1.2.0`，模板声明 `@stratix/forge:^1.2.0`。既有项目不会被 npm 升级自动改写。Forge 1.2 的 admin-page/admin-crud 需要本版公共组件；生成前会检查缺失文件，失败不写入文件，`--force` 也不绕过检查。

升级旧项目时，在临时目录生成一份 1.2.0 web-admin 对照项目，迁移 `components/admin/actions`、`layout`、`forms/form-dialog.tsx`、`data-table`、`components/shared/form` 和 `components/ui/field.tsx`，以及 TanStack Form、jsdom 依赖；保留旧业务仍使用的 RHF/FormSheet，待逐页迁移后删除。对照合并 Query/apiClient 等既有基础接口并运行 build/test，然后使用新版生成器。不要对旧业务文件直接运行 create 或用 --force 覆盖。
