# 开发工作流

这一页把插件开发收敛成一条固定工作流。你每次做新插件、补能力、修问题，都尽量沿着这条顺序走。

## 推荐顺序

1. 初始化插件项目
2. 选模板并确认预设
3. 生成 adapter / service / controller / executor
4. 先打通最小链路
5. 在真实应用里注册验证
6. 补测试、补文档、补 README

## 1. 初始化

```bash
stratix init plugin integration @acme/your-plugin
```

如果你已经知道自己只做 adapter 型插件，就把 `integration` 换成 `adapter`；如果你需要 repository，就优先考虑 `data`。

## 2. 生成资源，而不是手搓骨架

常用命令：

```bash
stratix generate plugin-adapter foo
stratix generate plugin-service foo
stratix generate plugin-controller foo
stratix generate plugin-executor foo
```

这一步的意义不是省几分钟，而是让目录、命名和层级天然符合 CLI 约定。

## 3. 先打通最小链路

第一次开发时，不要一上来就接真实第三方系统。  
更稳的做法是先打通这条最小链路：

```text
adapter -> service -> controller
```

只有这条链路已经跑通，再把 adapter 替换成真实 SDK、HTTP 客户端或数据库访问逻辑。

## 4. 每次改完都做 3 个检查

### 构建检查

```bash
pnpm build
```

### 测试检查

如果模板带 `testing` 预设：

```bash
pnpm test
```

### 接入检查

把插件注册到一个真实应用里，至少验证一条路由或一个 executor。

## 5. 插件接入时要检查什么

- 插件是否真正进入了应用的 `plugins` 数组
- `name` 是否稳定、可读
- 依赖的基础设施插件是否先于它注册
- 插件配置项是否都放在 `options` 里
- adapter / controller / executor 的目录是否仍在自动扫描范围内

## 6. 什么时候该加 repository

只有当插件真的需要自己的持久化逻辑时，再加 repository。  
如果你的插件只是对接上游服务、包装 SDK、暴露 HTTP 接口，完全可以先只有 adapter + service。

## 7. 什么时候该加 executor

满足下面任一条件，再考虑 executor：

- 你想把插件能力接进 `@stratix/tasks`
- 你希望插件暴露一个独立执行单元
- 你要支持调度、工作流或后台执行

否则先把 HTTP 或 service 链路做稳。

## 8. 发布前检查清单

- `package.json` 名称、版本、导出入口正确
- `src/index.ts` 中 discovery / services 配置正确
- `plugin-config.ts` 已定义清晰的配置合同
- 至少一条真实可运行能力已经在应用里验证通过
- README、开发者文档、变更说明已同步

## 9. 不要把插件做成什么样

- 不要把插件写成“只有一个超大 service 文件”
- 不要把第三方 SDK 调用散落到 controller
- 不要把应用私有业务硬塞进公共生态插件
- 不要只在插件项目里自测，从不接进真实应用

## 最后的判断标准

如果别人拿到你的插件后，只需要：

1. 安装包
2. 在 `plugins` 里注册
3. 传入清晰的 `options`
4. 调用公开路由、service 或 executor

就能跑起来，那这个插件才算真正具备生态可复用性。
