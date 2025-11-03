import { createFileRoute } from '@tanstack/react-router'
import { ConfigList } from '@/features/system-config/pages/config-list'

export const Route = createFileRoute('/_authenticated/system-config/')({
  component: () => (
    <ConfigList
      title='全部配置'
      description='查看和管理所有系统配置参数'
    />
  ),
})

