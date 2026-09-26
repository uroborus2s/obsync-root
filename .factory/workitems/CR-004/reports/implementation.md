# CR-004 实现摘要

参考 ita-club shared/form 和 ui/field 复用公共字段与错误布局；两仓表格原本同源，因此扩展本模板 DataTable，不重复移植业务组件。保留原 token/Radix/导航。

Create/preview 删除 RHF/FormSheet，登录和用户表单改 TanStack Form+FormDialog，公共表单拥有 native form、失败信息、dirty discard 与重复提交锁。共享 PageHeader/CreateButton 提供生成器和用户页的实际双消费。DataTable 接入稳定 id、known/unknown 分页、可配置页容量、10k 虚拟行 demo。

Forge CRUD 不再输出未使用的 API 占位与局部状态；输出 search 校验、Query key/hooks、适配既有 apiClient 的 mock/HTTP 层、表单和 API/URL 测试。普通 admin-page 新建 action 待接线时禁用。复杂新建容器按文档由业务选择独立/分步页面，不添加万能表单 schema renderer。

验证参考 evidence/verification.md。变更仅本地，新旧生成项目不自动迁移；changeset 仅登记后续发布，不执行版本升级或发布。

集中审查 R1 已修复：详情缓存刷新失败/成功重试均不卸载或重置正在编辑的脏表单；生成页回归测试覆盖该路径。虚拟表头采用独立边框绘制，浏览器滚动透字已消除。
