# BUG-009 根因证据

- 日期：2026-09-01
- 结论：root_cause_found

## 生产现象

日历权限列表请求实际发送
`/v7/calendars/{calendar_id}/permissions?page_size=20`，WPS 返回 HTML
`403 Forbidden`。

## 代码证据

`HttpClientService` 原实现将 `config.url` 直接传入 KSO-1 签名，而请求参数位于
`config.params`。Axios 发送时才把两者合并，因此签名输入缺少查询字符串。

## RED

新增测试断言签名 URI 包含 `?page_size=20`，修复前实际只收到路径；测试
1 failed / 13 passed，稳定复现。
