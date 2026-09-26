# CR-004 本地验证

候选：`candidate.json` 的 SHA-256 文件清单；分支 1.1.0。代码实际执行工具轨迹先于本文，日志来自对应工具调用，无凭证或生产数据。

| 编号 | 范围 / 命令 | 结果 |
| --- | --- | --- |
| TEST-CONTRACT-ADMIN-CREATE | `pnpm --filter @stratix/create test` | 7/7，exit 0 |
| TEST-CONTRACT-ADMIN-FORGE | `pnpm --filter @stratix/forge test` | 70/70，exit 0；当前候选复核日志同名 |
| TEST-UNIT-ADMIN-PREVIEW | `pnpm --dir examples/web-admin-preview test` | 9 files，34/34，exit 0 |
| TEST-BB-ADMIN-GENERATED | source CLI create web-admin + generate admin-crud project-member + admin-page notice，独立 pnpm install 后 test | 11 files，38/38，exit 0 |
| TEST-BB-ADMIN-BUILD | preview + generated `pnpm build` | 两者 exit 0，含 Vite + tsc；已有大 chunk 警告 |
| TEST-STATIC-ADMIN | preview + generated `pnpm lint`；Create/Forge tsc；`git diff --check` | exit 0；Fast Refresh / pinned-offset hook warnings 保留 |
| TEST-DOC-ADMIN | `pnpm run docs:validate` | 89 pages / 0 contracts，exit 0；初次 uv 缓存被沙盒阻止，获工具批准重跑 |
| TEST-UI-ADMIN | Codex IAB，生成消费者的演示模式 | 登录、万行表格可见行/滚动、分页、新建校验、脏关闭确认、保存与 Query 刷新、390px 表单；表头无正文透字、URL 搜索刷新恢复及表格 390px 内部横向滚动复验通过 |

## 可复验环境

- consumer: `/private/tmp/cr004-generated-20260926/admin-check`，仅演示数据，独立安装 manifest 声明版本。
- 启动：`pnpm --dir /private/tmp/cr004-generated-20260926/admin-check dev --host 127.0.0.1 --port 5194 --strictPort`；健康：IAB 成功渲染登录页。
- 停止：主控给本次启动 exec session 发 SIGINT。生成器更新临时源文件后 Vite watcher 未刷新旧缓存，重启该进程验证最新候选；并非把旧页面当最终证据。
- 浏览器工具回执包含 DOM / 截图；没有实际设备、生产、真实业务 API 或无障碍全面审计。
- 原始日志：`/tmp/cr004-{create-test,forge-test,preview-test,preview-build,preview-lint,consumer-test,consumer-build,consumer-lint,consumer-install,docs}.log`；生成脚本 `/tmp/cr004-generate.mts`、`/tmp/cr004-refresh.mts`。

## 发现与修正

- RED：Forge 单例测试明确失败于旧 useCrud/FormSheet 输出；生成器改为 useList/FormDialog 后同案例通过。
- 新增导航暴露旧测试依赖数组下标；改为按用户模块语义查找分组。
- fresh consumer 暴露 pageSize 字面量联合类型与 number 回调不匹配，保持值校验并使用 number 输出。
- fresh consumer 新版 Router 错误边界支持 unknown，旧 Error 假设不兼容；使用官方 ErrorComponentProps 与已有 getErrorMessage。
- 浏览器大表格滚动时半透明表头透出数据；改为不透明背景、虚拟表格使用 separate 零间距边框并保留单元格分隔线；浏览器滚动截图不再透出正文。补模式切换测试。

测试结果总数：按三套不同套件分别列出，不跨重复模板用例相加为覆盖率；所有已列最终自动化套件 failed/error/skipped/cancelled=0。未跑：真实后端、部署、移动真机。

## 最终回归补充

- 审查 R1：缓存详情后台刷新失败时 isError 为 true，原编辑门控卸载表单。新增生成页回归测试先失败（脏值由预期文本变为 undefined），移除该门控后通过；成功重试仍保留脏输入。原始 red/green 日志见本 evidence 目录。
- 最终 preview：9 files / 34 tests；生成消费者：11 files / 38 tests；两套 build + tsc + lint exit 0；Forge 70/70 exit 0。
- 浏览器：万行数据实际只渲染 15～23 行，滚动换行；分页下一页正常；生成 CRUD 名称搜索写入 URL 并在刷新后恢复；390px 页面无外部横向溢出。
- 存在非阻塞 warnings：构建 bundle >500kB；lint Fast Refresh 与已有 pinned-offset hooks；临时消费者 devtools 渲染 script 警告。因此不宣称零警告。

最终复审：reviews/review-2.md approved，Important/Critical 未关闭数 0。最终构建产物通过 vite preview 再次检查万行虚拟滚动、表头和分隔线；临时 dev/preview 进程已停止。原始日志已复制本目录，进程回执退出码记录在 executions.json。
