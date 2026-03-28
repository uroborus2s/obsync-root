---
title: 灵枢枢机（Stratix）框架以及生态
mkdocs:
  home_access: public
  nav:
    - title: 入门说明
      children:
        - title: 概览
          path: 01-getting-started/index.md
          access: public
        - title: 项目概览
          path: 01-getting-started/project-overview.md
          access: public
        - title: 快速开始
          path: 01-getting-started/quick-start.md
          access: public
        - title: 文档地图
          path: 01-getting-started/document-map.md
          access: public
    - title: 用户指南
      children:
        - title: 概览
          path: 02-user-guide/index.md
          access: public
        - title: 使用与接手说明
          path: 02-user-guide/user-guide.md
          access: public
    - title: 开发者指南
      children:
        - title: 概览
          path: 03-developer-guide/index.md
          access: public
        - title: 函数 API
          children:
            - title: 版本索引
              path: 03-developer-guide/function-api/index.md
              access: public
            - title: v1.1.0
              children:
                - title: 概览
                  path: 03-developer-guide/function-api/v1.1.0/index.md
                  access: public
                - title: Core 与运行时
                  path: 03-developer-guide/function-api/v1.1.0/core.md
                  access: public
                - title: 运行时与插件 API
                  path: 03-developer-guide/function-api/v1.1.0/core-runtime-plugin.md
                  access: public
                - title: Context 与 Data API
                  path: 03-developer-guide/function-api/v1.1.0/core-context-data.md
                  access: public
                - title: Environment 与 Auth API
                  path: 03-developer-guide/function-api/v1.1.0/core-environment-auth.md
                  access: public
                - title: Async API
                  path: 03-developer-guide/function-api/v1.1.0/core-async.md
                  access: public
                - title: Logger 与 Utils API
                  path: 03-developer-guide/function-api/v1.1.0/core-logger-utils.md
                  access: public
                - title: Service API
                  path: 03-developer-guide/function-api/v1.1.0/service.md
                  access: public
                - title: Functional API
                  path: 03-developer-guide/function-api/v1.1.0/functional.md
                  access: public
                - title: Pipe 与 Compose API
                  path: 03-developer-guide/function-api/v1.1.0/functional-pipe-compose.md
                  access: public
                - title: Either 与 Maybe API
                  path: 03-developer-guide/function-api/v1.1.0/functional-either-maybe.md
                  access: public
                - title: Curry 与 Optics API
                  path: 03-developer-guide/function-api/v1.1.0/functional-curry-optics.md
                  access: public
                - title: Performance、Streams 与 Brands API
                  path: 03-developer-guide/function-api/v1.1.0/functional-performance-streams-brands.md
                  access: public
        - title: 应用后端开发
          children:
            - title: 概览
              path: 03-developer-guide/应用后端开发/index.md
              access: public
            - title: 快速开始
              path: 03-developer-guide/应用后端开发/getting-started.md
              access: public
            - title: 项目结构
              path: 03-developer-guide/应用后端开发/project-structure.md
              access: public
            - title: 第一个功能
              path: 03-developer-guide/应用后端开发/first-feature.md
              access: public
            - title: 数据库快速接入
              path: 03-developer-guide/应用后端开发/database-quickstart.md
              access: public
            - title: 第一个真实 CRUD
              path: 03-developer-guide/应用后端开发/database-crud.md
              access: public
            - title: 从单表 CRUD 到模块化项目
              path: 03-developer-guide/应用后端开发/from-crud-to-modules.md
              access: public
            - title: 测试与排错
              path: 03-developer-guide/应用后端开发/testing-and-debugging.md
              access: public
            - title: 开发工作流
              path: 03-developer-guide/应用后端开发/development-workflow.md
              access: public
            - title: 架构约定
              path: 03-developer-guide/应用后端开发/architecture-conventions.md
              access: public
            - title: 插件选型
              path: 03-developer-guide/应用后端开发/plugin-selection.md
              access: public
            - title: 常见错误
              path: 03-developer-guide/应用后端开发/common-pitfalls.md
              access: public
        - title: 脚手架开发
          children:
            - title: 概览
              path: 03-developer-guide/脚手架开发/index.md
              access: public
            - title: 快速开始
              path: 03-developer-guide/脚手架开发/getting-started.md
              access: public
            - title: 项目结构
              path: 03-developer-guide/脚手架开发/project-structure.md
              access: public
            - title: 开发工作流
              path: 03-developer-guide/脚手架开发/development-workflow.md
              access: public
            - title: 从零做一个业务页
              path: 03-developer-guide/脚手架开发/build-your-first-app.md
              access: public
        - title: 插件开发
          children:
            - title: 概览
              path: 03-developer-guide/插件开发/index.md
              access: public
            - title: 快速开始
              path: 03-developer-guide/插件开发/getting-started.md
              access: public
            - title: 项目结构
              path: 03-developer-guide/插件开发/project-structure.md
              access: public
            - title: 第一个生态插件实战
              path: 03-developer-guide/插件开发/build-your-first-plugin.md
              access: public
            - title: 开发工作流
              path: 03-developer-guide/插件开发/development-workflow.md
              access: public
            - title: 插件目录
              path: 03-developer-guide/插件开发/plugin-catalog.md
              access: public
            - title: 组合指南
              path: 03-developer-guide/插件开发/composition-guide.md
              access: public
    - title: 项目开发文档（内）
      children:
        - title: 概览
          path: 04-project-development/index.md
          access: private
        - title: 项目治理
          children:
            - title: 概览
              path: 04-project-development/01-governance/index.md
              access: private
            - title: 项目章程
              path: 04-project-development/01-governance/project-charter.md
              access: private
        - title: 调研与决策
          children:
            - title: 概览
              path: 04-project-development/02-discovery/index.md
              access: private
            - title: 项目输入
              path: 04-project-development/02-discovery/input.md
              access: private
            - title: 头脑风暴记录
              path: 04-project-development/02-discovery/brainstorm-record.md
              access: private
            - title: 当前状态分析
              path: 04-project-development/02-discovery/current-state-analysis.md
              access: private
        - title: 需求
          children:
            - title: 概览
              path: 04-project-development/03-requirements/index.md
              access: private
            - title: PRD
              path: 04-project-development/03-requirements/prd.md
              access: private
            - title: 需求分析
              path: 04-project-development/03-requirements/requirements-analysis.md
              access: private
            - title: 需求验证
              path: 04-project-development/03-requirements/requirements-verification.md
              access: private
        - title: 设计文档
          children:
            - title: 概览
              path: 04-project-development/04-design/index.md
              access: private
            - title: 技术选型与工程规则
              path: 04-project-development/04-design/technical-selection.md
              access: private
            - title: 系统架构
              path: 04-project-development/04-design/system-architecture.md
              access: private
            - title: 模块边界
              path: 04-project-development/04-design/module-boundaries.md
              access: private
            - title: API 设计
              path: 04-project-development/04-design/api-design.md
              access: private
            - title: 后端设计
              path: 04-project-development/04-design/backend-design.md
              access: private
        - title: 开发过程文档
          children:
            - title: 概览
              path: 04-project-development/05-development-process/index.md
              access: private
            - title: 实施计划
              path: 04-project-development/05-development-process/implementation-plan.md
              access: private
        - title: 测试与验证
          children:
            - title: 概览
              path: 04-project-development/06-testing-verification/index.md
              access: private
            - title: 测试计划
              path: 04-project-development/06-testing-verification/test-plan.md
              access: private
        - title: 发布与交付
          children:
            - title: 概览
              path: 04-project-development/07-release-delivery/index.md
              access: private
            - title: 发布说明
              path: 04-project-development/07-release-delivery/release-notes.md
              access: private
        - title: 运维与维护
          children:
            - title: 概览
              path: 04-project-development/08-operations-maintenance/index.md
              access: private
            - title: 部署指南
              path: 04-project-development/08-operations-maintenance/deployment-guide.md
              access: private
        - title: 演进复盘
          children:
            - title: 概览
              path: 04-project-development/09-evolution/index.md
              access: private
        - title: 追踪矩阵
          children:
            - title: 概览
              path: 04-project-development/10-traceability/index.md
              access: private
            - title: 需求追踪矩阵
              path: 04-project-development/10-traceability/requirements-matrix.md
              access: private
---
# 灵枢枢机（Stratix）框架以及生态

这是本仓库的正式项目文档源。一级结构已经对齐 docs-stratego 标准：入门说明、用户指南、开发者指南、项目开发文档（内）。

## 面向读者

- 首次接触灵枢枢机仓库的新协作者
- 基于 `@stratix/cli` 做应用开发与脚手架开发的工程师
- 维护框架核心与生态插件的贡献者

## 维护规则

- 根 `docs/index.md` 是唯一导航清单文件，统一声明全站目录树、页面路径和页面权限。
- 子目录 `index.md` 只负责目录说明与边界约束，不再手写第二套导航。
- 开发者指南除三条主线外，还维护一套按版本演进的函数 API 参考，作为公共导出面的单点索引。
- 开发者指南固定分为“应用后端开发、脚手架开发、插件开发”三部分维护。
- 仓内链接统一使用相对路径，不写机器绝对路径。
