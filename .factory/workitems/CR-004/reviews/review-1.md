CR-004 / TASK-ADMIN-003 / dispatch_id=CR004-review-1
reviewer_type=independent_subagent；reviewer_id=/root/admin_review。本 reviewer 未参与实现，仅只读源码、证据及执行一次无写入的 Query 行为复现。

候选：`evidence/candidate.json` fingerprint `5115fe673f7c67c392838c3bbd87c608487e0f9e2af7fcf9fdf2a950f8ef86bb`；核对 HEAD、57 个文件 SHA-256 和全部删除项一致。标准：CR-004 `brief.md`，2026-09-26 授权范围。

**review_status=changes_requested；scope_conclusion=需整改；next_gate_status=return_to_orchestrator。**

Spec Review：组件、TanStack Form、真实分页、虚拟表格和生成 CRUD 基础已覆盖，但 CR004-R1 违反编辑失败保留输入要求。
Quality Review：已有行为测试有效覆盖公共组件；生成页面将 Query 错误状态转换为表单卸载，存在测试未覆盖的数据丢失路径。

**CR004-R1 — Important — open**

位置：`packages/forge/templates/resources/admin-crud/files/src/features/module/pages/resource-page.tsx.tpl:75`

编辑表单的挂载条件包含 `!detail.isError`。详情已缓存超过 30 秒后再次打开编辑，Query 会先提供缓存并后台刷新；用户此时输入内容，随后后台请求失败，Query 保留原有 `data`，但 `isError=true` 导致整个表单卸载。重试成功后重新挂载，未保存输入丢失，且没有放弃修改确认。

使用生成消费者实际安装的 `QueryClient/QueryObserver` 定向复现，exit 0：过期缓存刷新前 `hasData=true/isError=false/renderForm=true`，刷新拒绝后 `hasData=true/isError=true/renderForm=false`。代码卸载与表单本地状态归属确认后续输入丢失。项目禁用了窗口聚焦刷新，因此复现入口采用过期缓存再次编辑；网络重连刷新也可能触发。

修复方向：已有同 ID 详情时保持编辑表单挂载，独立展示后台刷新错误；补充生成页面层回归，断言详情刷新失败和成功重试均保留输入。现有 `UserFormDialog` 保值测试无法覆盖这一父页面卸载条件。

检查范围包括 Create/preview 镜像、公共表单/分页/虚拟表格、登录迁移、Forge API/search/hooks/page/form、生成测试和组件文档。读取原始日志确认 Create 7、Forge 70、preview 34、consumer 37 项通过；preview/consumer 构建及 lint 日志仅有已说明 warnings，文档输出 89 pages。这些日志未嵌入进程退出码，exit 0 来自验证记录；本 reviewer 未重复运行整套测试。

未检查真实后端、生产、真机与完整无障碍验收。父任务正在复验的虚拟表头绘制问题未纳入本候选批准；后续源码修改需绑定新候选后局部复审。
