import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * 数据查询布局路由
 * 提供子路由的渲染容器
 */
export const Route = createFileRoute('/_authenticated/data-query')({
  component: DataQueryLayout,
})

function DataQueryLayout() {
  return <Outlet />
}
