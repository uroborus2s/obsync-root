import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * 数据查询首页路由
 * 重定向到第一个子页面（缺勤历史明细表）
 */
export const Route = createFileRoute('/_authenticated/data-query/')({
  beforeLoad: () => {
    // 重定向到第一个子页面
    throw redirect({
      to: '/data-query/absent-history',
    })
  },
})

