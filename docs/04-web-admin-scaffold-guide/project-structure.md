# 项目结构

以 `examples/web-admin-preview` 为例，“幻廊之镜”脚手架目录主要分为下面几层：

## 应用层

- `src/app/config/navigation.ts`: 侧边导航与菜单配置
- `src/app/providers/`: 全局 provider，例如认证、主题
- `src/app/query-client.ts`: TanStack Query 客户端配置

## 路由层

- `src/routes/__root.tsx`: 根路由
- `src/routes/_authenticated/`: 登录后布局和业务页面
- `src/routes/login.tsx`, `401.tsx`, `403.tsx`, `500.tsx`: 认证与错误页
- `src/routeTree.gen.ts`: 路由生成产物

## 布局与页面骨架

- `src/layouts/admin-layout.tsx`: 管理后台主布局
- `src/components/shared/`: 跨页面共享组件
- `src/components/ui/`: UI 基础组件

## 基础设施层

- `src/lib/api/`: API 客户端、错误封装、query keys
- `src/lib/theme.ts`: 主题相关逻辑
- `src/lib/utils.ts`: 通用前端工具函数

## 测试

- `src/lib/__tests__/`: 当前样例中的基础测试目录

实践建议：

- 路由状态和页面装配留在 `routes/`。
- 通用 UI 组件保持在 `components/ui/`。
- 可复用业务组件放到 `components/shared/` 或新的业务组件目录。
- API 协议和数据访问统一收口到 `src/lib/api/`。
