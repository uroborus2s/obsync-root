# CR-004 集中审查输入

身份：CR-004 / TASK-ADMIN-003；current_gate=needs_independent_review。
权威目标：brief.md（2026-09-26 用户授权）。实施：reports/implementation.md；验证：evidence/verification.md 和其原始 /tmp 日志；候选精确绑定：evidence/candidate.json（HEAD + deletions + dirty/untracked source sha256）。

请审查批准范围的需求覆盖、组件复用、分页真实语义、虚拟表头、FormDialog 失败/关闭/重复提交、Router 状态、Query 失效、生成输出是否实际可运行。源码模板与 preview 互为镜像但消费者有实际独立 install/build/test。不得只用作者摘要替代读取源码。大型历史 warnings/旧整体后端不在本轮。

允许只读：本仓 AGENTS、上述计划/brief/evidence/reports、git diff/status、相关 source/templates/tests/docs，临时生成消费者与 /tmp/cr004-*.log。可运行无外部副作用的目标测试，禁止修改任意文件、提交、发布、部署、读密钥、进一步派发。
