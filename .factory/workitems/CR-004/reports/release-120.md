# CR-004 Create/Forge 1.2.0 发布候选

用户授权本次 1.2.0 版本更新发布，并明确目标为配置的 Aliyun 私库。只发布 Create、Forge，不发布 Database 及其他包。复用发布说明 3.1 的包级 `pnpm publish --registry=<configured Aliyun> --no-git-checks` 入口，不走 public npmjs 全工作区发布。

版本由 Changesets 在隔离元数据目录仅消费本轮 minor 与两包既有工具链 patch 得到；只回写两个 package.json / CHANGELOG，保留 Database changeset。模板新项目声明 Forge ^1.2.0。旧项目先迁移公共组件；admin-page/admin-crud 生成前检查必需文件，--force 也不能跳过，失败不写入业务文件。

新增回归先红：旧实现未拒绝缺少基础组件的旧项目；修复后 Forge 71/71、Create 7/7 通过。两包 build 通过。实际 pnpm pack 产物安装到 /private/tmp/cr004-release-120；用包内 CLI 创建后台、生成 CRUD 和 page，独立安装（Forge 通过临时 override 指向待发 tarball）后 38/38 tests、build+tsc、lint 通过；CLI 包全部依赖审计及后台生产依赖审计均无已知漏洞。

工作区 quality:release 的 build/typecheck/lint/tests/core coverage/packed Core smoke/generated API smoke 均执行通过；docs 因沙盒 uv 缓存权限失败，获工具批准重跑通过（89 pages）。单独继续 security:audit 发现其他包的 19 个漏洞（13 high/6 moderate），全工作区门禁不通过；本次包级审计无漏洞，未扩大修改其他包。release gate dry-run 通过，但不将 dry-run 当作完整发布验证。

原始日志 /tmp/cr004-release-*.log；本轮只对版本、旧模板保护和打包消费者增量复审，基础实现沿用 review-2.md。尚未宣称提交/发布完成。

两个精确 tarball 的 Aliyun publish dry-run 均 exit 0。Git 1.1.0 与 main 存在大量既有历史差异（844 路径），本次仅提交/推送 1.1.0 并对精确发布提交建立两个新标签；不将其他任务历史整体合入 main。并未绕过 main 的 PR 规则，本次不修改 main。

## 发布完成回执

2026-09-26，两包实际 publish 均 exit 0。Aliyun 的 exact version 和 latest 均为 1.2.0，dist.integrity 与已审查 tarball 完全一致。代码提交 f7509a01193e041cf3555d96f42020d27d6baedc 已推送 1.1.0；两个 @stratix/<包>@1.2.0 annotated tags 已推送并解引用到该提交。

发布后从 registry 全新安装两个包（/private/tmp/cr004-published-120，无 tarball override），实际 CLI 创建后台、生成 CRUD/page，安装依赖后 38/38 tests 与 build（含 tsc）通过，exit 0。

远端 CI run 36225067859 在安装整个仓库时失败：public registry 无既有私有包 @stratix/utils。该结果与本次两个包及新后台的独立安装验证分开记录，不宣称远端 CI 或全仓门禁通过。main 保持不变；未发布其他包、未部署业务后台。
