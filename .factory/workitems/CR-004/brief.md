# CR-004 管理后台脚手架公共组件与 TanStack 基础

- 日期：2026-09-26；来源：本会话用户明确要求参照 ita-club 丰富后台模板。
- 授权：本地实现、安装所需依赖、测试、文档同步；不修改 ita-club，不发布、不推送。
- 分支：1.1.0；当前工作区初始干净。
- work_item_id: CR-004
- task_card_id: TASK-ADMIN-001
- wbs_id: TASK-ADMIN-001
- current_gate: implementation_authorized
- write_policy: source_or_test_write
- allowed_paths: packages/create/templates/apps/web-admin/**, packages/forge/templates/resources/admin-crud/**, packages/forge/templates/resources/admin-page/**, packages/create/tests/create.test.ts, packages/forge/tests/run-cli.test.ts, examples/web-admin-preview/**, docs/03-developer-guide/脚手架开发/**, docs/04-project-development/02-discovery/current-state-analysis.md, .factory/workitems/CR-004/**, .factory/memory/current-state.md, .factory/project.json, .changeset/**
- forbidden_actions: 修改 main、修改 ita-club、发布、部署、push、未经请求 commit、改动无关后端。

## 已确认事实与设计

Router/Table/Query 已接入；Form 仍是 React Hook Form；CRUD 生成 hook 是 React 本地状态，API 为无功能占位。
ita-club 已采用 TanStack Form + shared/form/FormFieldLayout + shadcn Field，其表格与本模板同源，复用其字段布局而不复制俱乐部业务。
保留现有视觉 token、导航布局、TanStack QueryClient；简单新建/编辑使用居中 FormDialog。复杂表单采用独立页面和返回入口，不自动按字段数推断。
公共表格扩展真实分页语义、稳定行 id、可选虚拟行、大数据示例；分页必须支持空数据、总量未知时不伪造总页数。
基础控件沿用 shadcn；无额外设计系统。新增依赖仅 TanStack Form 与必要的既有测试栈 DOM 支持。

## 验收

1. Create 模板与 preview 一致接入 TanStack Form，登录和用户表单使用共享字段布局；简单新建不再侧滑。
2. DataTable/Pagination 适用于本地和服务端分页，空数据无第 1/0 页；虚拟行示例证明大数据不全部挂 DOM。
3. CRUD 生成器实际使用 Router 搜索参数、Query 查询/变更、Form 验证、Table；失败保留输入；新建/更新后刷新并恢复列表状态。
4. 模板输出可构建、类型检查与相关测试通过；桌面/小屏检查表单、分页、大表格；交付说明验证边界。
5. 文档给出公共组件清单、分页和大表格接法、四项 TanStack 职责及真实 API 替换边界。

## 来源

- ita-club/apps/admin/src/components/shared/form 与 components/ui/field.tsx（只读）
- https://ui.shadcn.com/docs/forms/tanstack-form
- https://tanstack.com/form/latest/docs/framework/react/guides/validation
- https://tanstack.com/table/v8/docs/guide/virtualization

## 2026-09-26 发布授权追加

用户明确要求按 Create/Forge 1.2.0 更新发布，并确认沿用阿里云私有 registry。授权版本/CHANGELOG 更新、必要兼容检查、打包与消费者核验、gitcommitzh 提交、推送和 PR 合入、两个包发布与精确版本核验。此前“不发布/不推送”仅属实现阶段边界，本次授权覆盖。仅发布 Create/Forge；不发布 Database 或其他包，不改写既有标签，不部署业务应用。
