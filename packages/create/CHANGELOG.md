# @stratix/create

## 1.2.0

### Minor Changes

- 丰富管理后台脚手架：公共新建按钮、页头、真实分页与可选虚拟表格；统一 TanStack Form 字段布局和居中表单，移除旧 RHF/FormSheet 默认。CRUD 资源使用 Router 查询参数、Query 异步读写与共享 API 客户端，带可运行 mock 和契约测试。现有生成项目不会自动迁移。

### Patch Changes

- Migrate generated projects to TypeScript 7 and Oxlint, and move Forge source analysis from the removed TypeScript Compiler API to the Oxc parser.
