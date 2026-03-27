---
mkdocs:
  home_access: internal
  nav:
    - title: 框架开发过程文档
      path: 01-framework-development/index.md
      access: internal
    - title: 生态插件说明
      path: 02-plugin-ecosystem/index.md
      access: internal
    - title: 后端应用开发者指南
      path: 03-backend-application-guide/index.md
      access: internal
    - title: 幻廊之镜前端脚手架开发指南
      path: 04-web-admin-scaffold-guide/index.md
      access: internal
---
# 文档中心

本目录是“灵枢枢机（Stratix）框架以及生态”的正式人类文档层。

文档按四大类维护：

1. `01-framework-development/`
2. `02-plugin-ecosystem/`
3. `03-backend-application-guide/`
4. `04-web-admin-scaffold-guide/`

推荐阅读顺序：

1. `01-framework-development/01-discovery/current-state-analysis.md`
2. `01-framework-development/02-requirements/`
3. `01-framework-development/03-solution/`
4. `03-backend-application-guide/`
5. `04-web-admin-scaffold-guide/`

说明：

- 顶层 `README.md` 只保留稳定项目入口。
- 当前验证结论以 discovery 与 `.factory/` 为准。
- `.factory/` 负责 AI 记忆、过程控制和工作项，不替代正式文档。
