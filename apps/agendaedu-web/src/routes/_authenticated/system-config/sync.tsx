import { createFileRoute } from '@tanstack/react-router'
import { ConfigList } from '@/features/system-config/pages/config-list'

export const Route = createFileRoute('/_authenticated/system-config/sync')({
  component: () => (
    <ConfigList
      configGroup='sync'
      title='同步任务配置'
      description='管理数据同步任务的配置参数，包括全量同步和增量同步计划'
    />
  ),
})

