# BUG-009 WAS V7 查询参数签名缺失

- 类型：BUG
- 状态：READY_FOR_RELEASE
- 优先级：P0
- 阶段：POST_RELEASE_CONSUMER_REMEDIATION
- 日期：2026-09-01

## 现象

通过 `HttpClientService` 的 `params` 发送查询参数时，WPS 收到的请求 URI 含
查询字符串，但 KSO-1 签名只覆盖路径，接口返回 `403 Forbidden`。

## 根因

请求拦截器把 `config.url` 传给 `SignatureService`，遗漏 Axios 独立保存并在
发送前序列化的 `config.params`，导致签名 URI 与实际请求 URI 不一致。

## 修复边界

- 使用 Axios 的最终 URI 作为 KSO-1 签名输入。
- 增加查询参数签名回归测试。
- 发布 `@stratix/was-v7@1.0.0-beta.37` 到仓库配置的 npm registry。

## 人工确认

用户明确指定包源码位置，并要求修复、升级版本、提交和发布新 npm 版本。
