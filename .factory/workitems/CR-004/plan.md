# CR-004 实施计划

spec_ref: brief.md（2026-09-26 用户授权范围）
current_gate: completed_local

## Work Breakdown

| id | parent_id | title | status |
| --- | --- | --- | --- |
| TASK-ADMIN-001 | CR-004 | 表单基础与非侧栏新建 | completed |
| TASK-ADMIN-002 | CR-004 | 公共分页与大表格 | completed |
| TASK-ADMIN-003 | CR-004 | 生成器 Router/Query 集成及质量收口 | completed |

## 任务接口与写集

- TASK-ADMIN-001 owner=form worker，priority=P1，task_scope=project，IMPLEMENTS CR-004 brief。写 create/preview 的 components/shared/form、components/ui/field.tsx、components/ui/form.tsx、components/admin/forms、features/auth/pages/login-page.tsx、features/users/components/user-form-*、features/users/pages/users-page.tsx 以及其定向测试。公共 FormDialog 采用 open/onOpenChange/title/description/children/onSubmit/submitLabel/submitting/isDirty；onSubmit 允许 Promise；关闭脏表单确认，提交中不重复提交。删除不再使用的 RHF primitive。不写依赖 manifest（主控负责）、Forge 或 table。
- TASK-ADMIN-002 owner=table worker，priority=P1，task_scope=project，IMPLEMENTS CR-004 brief。写 create/preview 的 components/admin/data-table/**、features/table-demo/**、routes/_authenticated/table-demo.tsx。DataTable 保持已有调用兼容，新增虚拟行开关/高度/行 id 和真实分页总量与未知总量接口；生成 demo 为第二个消费点。主控改导航。不写其他 features 或 manifest。
- TASK-ADMIN-003 owner=root，priority=P1，task_scope=project，IMPLEMENTS CR-004 brief。写 Forge admin-crud/admin-page、manifest/lock、Create/Forge 测试、文档与 .factory，以及必要接线。CRUD 使用 FormDialog + shared/form 导出；Query async API 边界与本地 mock 可运行；Router URL 承载搜索/分页/排序。依赖前两项接口。

## 批次验证

先最小失败行为测试，再实现；复用 Vitest/node:test。worker 定向检查，root 安装与完整 preview test/typecheck/build/lint、Create/Forge 测试、生成消费者构建、浏览器交互；最后独立只读 review 后整改复测。无需业务 API/生产验收，未执行项明确报告。
预检：分支 1.1.0，源模板 CLI 版本 create=1.1.2/forge=1.1.4，preview 单独 pnpm lock；三个写集互斥，公共 FormDialog 接口如上，未决产品决策=none。

## 路由

workers: workflow_id=execution-workflow, write_policy=source_or_test_write, execution_authorized=true, current_gate=implementation_authorized, task_complexity=complex, risk_level=medium, reasoning_demand=judgment, dispatch_role=worker, dispatch_mode=subagent, execution_model=gpt-6-astra, requested_reasoning_effort=high, fork_turns=none。
依据 using-shanforge 子代理严格派发判定与 subagent-driven-development：表单和表格是独立可并行交付物。high 用于现有调用兼容、可访问性与状态语义判断；总耗用未知。主控保留生成器和集成验证。不得进一步派发。
