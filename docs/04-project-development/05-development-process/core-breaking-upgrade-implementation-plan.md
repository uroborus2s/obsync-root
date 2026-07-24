# Core 破坏性升级实施计划

- 文档编号：`PLAN-CORE-BREAK-20260617`
- 状态：实施中，core 包内关键门禁已通过

## 分工模型

| 角色 | 职责 | 当前结论 |
|---|---|---|
| 技术总监架构师 | 统一目标、边界、评分门禁和 code review | 采用破坏性升级，不保留旧入口 |
| 高级框架架构师 | 设计 discovery 管道和 API 边界 | 单一 `ApplicationDiscoveryPipeline` |
| 开发人员 | 删除旧实现、实现新组件装饰器和启动集成 | core 类型检查和构建通过 |
| 高级测试经理 | 建立契约测试和回归矩阵 | 25 个测试文件、196 个测试通过 |
| 文档开发 | 更新 README、设计和交付文档 | 新增 core 专项文档 |
| QA | 定义发布门禁和评分门槛 | 每个维度 95+ |

## 实施项

| 编号 | 工作项 | 状态 | 说明 |
|---|---|---|---|
| `TASK-CORE-BREAK-001` | 删除旧应用级发现文件 | 完成 | 删除旧入口和旧 scanner/analyzer/registrar |
| `TASK-CORE-BREAK-002` | 新增组件装饰器 | 完成 | `Service`、`Repository`、`Component` |
| `TASK-CORE-BREAK-003` | 启动流程改为新 discovery | 完成 | `runApplicationDiscovery` |
| `TASK-CORE-BREAK-004` | 配置 schema 严格化 | 完成 | 非契约字段失败 |
| `TASK-CORE-BREAK-005` | 更新测试基线 | 完成 | 删除旧契约测试，新增新契约测试 |
| `TASK-CORE-BREAK-006` | 更新文档和发布门禁 | 完成 | 本文档组 |

## Code Review 检查点

- 是否引入任何对旧应用级发现字段的读取。
- 是否把普通 class 注册回容器。
- 是否把已删除旧名称重新加入根导出。
- 是否把应用级 discovery 和插件级 AutoDI 配置混用。
- 是否存在 warn-and-continue 掩盖配置错误的路径。
- 是否有测试只验证实现细节而不验证公共契约。

