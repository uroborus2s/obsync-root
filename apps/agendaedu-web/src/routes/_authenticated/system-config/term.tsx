import { createFileRoute } from '@tanstack/react-router'
import { ConfigList } from '@/features/system-config/pages/config-list'

export const Route = createFileRoute('/_authenticated/system-config/term')({
  component: () => (
    <ConfigList
      configGroup='term'
      title='学期配置'
      description='管理学期相关的配置参数，如学期开始日期等'
    />
  ),
})

