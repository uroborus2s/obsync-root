# 项目结构

这篇文档不按“技术分层名词”讲，而按“你想改什么，就去哪里”来讲。下面默认以 `examples/web-admin-preview` 为参考。

## 1. 先记住这条总规则

在 `web-admin` 模板里，一个完整业务功能通常会拆成五块：

1. 菜单配置
2. 路由入口
3. 页面组件
4. 数据访问
5. 可复用业务组件

你只要先把这五块对应的路径记住，后面改页面就不会迷路。

## 2. 想改什么，就去哪里

| 你想做的事 | 优先改的文件或目录 | 说明 |
|---|---|---|
| 给左侧导航加菜单 | `src/app/config/navigation.ts` | 菜单标题、跳转地址、图标、关键词都在这里 |
| 新增一个页面路由 | `src/routes/_authenticated/*.tsx` | 每个后台页面通常都有一个对应路由文件 |
| 写页面主体 | `src/features/*/pages/` | 页面标题、说明、列表、表单、操作按钮通常在这里 |
| 写接口访问 | `src/features/*/api/` 或 `src/lib/api/` | 业务 API 放 feature 下，通用 API 能力放 `src/lib/api/` |
| 写查询或 mutation hooks | `src/features/*/hooks/` | 适合收口 TanStack Query 逻辑 |
| 写业务表单 schema | `src/features/*/lib/` | 适合放 zod schema、search 参数解析、工具函数 |
| 写可复用业务组件 | `src/features/*/components/` | 某个业务域内复用的筛选栏、表单、详情抽屉 |
| 写跨业务共享组件 | `src/components/shared/` | 多个业务页都能复用的组件 |
| 改通用 UI 基础组件 | `src/components/ui/` | Button、Card、Dialog、Table 这类基础积木 |
| 改后台整体外壳 | `src/layouts/admin-layout.tsx`、`src/components/admin/shell/` | 头部、侧栏、工作台布局 |

## 3. 路由相关文件怎么理解

路由层最重要的几个位置：

- `src/routes/__root.tsx`: 应用根路由
- `src/routes/_authenticated/route.tsx`: 登录后主布局挂载点
- `src/routes/_authenticated/*.tsx`: 各个业务页面路由
- `src/routes/login.tsx`: 登录页
- `src/routes/401.tsx`、`403.tsx`、`500.tsx`: 错误页
- `src/routeTree.gen.ts`: 路由生成产物，不手改

对新手来说，最常用的动作只有一个：

- 新增后台业务页时，在 `src/routes/_authenticated/` 新建一个文件

## 4. feature 目录怎么理解

`web-admin` 模板鼓励你按业务拆 feature，而不是把所有页面和接口都平铺在一个目录里。

比如 `users` 模块已经给了一个完整示例：

- `src/features/users/pages/`: 页面
- `src/features/users/api/`: API
- `src/features/users/hooks/`: query / mutation hooks
- `src/features/users/components/`: 表格列、筛选栏、抽屉、表单
- `src/features/users/lib/`: schema、search 参数解析
- `src/features/users/data/`: 当前样例里的 mock 数据

如果你要做一个真正的 CRUD 页面，`users` 就是最应该先读的参考模块。

## 5. 三类参考模块分别适合抄什么

### 5.1 最轻量页面

优先参考：

- `src/features/dashboard/pages/dashboard-page.tsx`
- `src/features/settings/pages/settings-page.tsx`

适合：

- 首页
- 说明页
- 配置页

### 5.2 列表和表格页

优先参考：

- `src/features/reports/pages/reports-page.tsx`
- `src/components/admin/data-table/`

适合：

- 统计页
- 报表页
- 只读列表页

### 5.3 CRUD 业务页

优先参考：

- `src/features/users/`

适合：

- 用户管理
- 客户管理
- 订单管理
- 任何需要查询、详情、新建、编辑的后台业务页

## 6. 新手最常见的误区

- 不要手改 `src/routeTree.gen.ts`。
- 不要一开始就改 `components/ui/`，先用现成积木把业务跑通。
- 不要把所有接口都堆到 `src/lib/api/`；业务专属接口优先放到对应 feature 下。
- 不要先做“大而全”目录。先做一个最小可运行页面，再逐步拆模块。

读完这里后，建议继续看 [开发工作流](./development-workflow.md)。
