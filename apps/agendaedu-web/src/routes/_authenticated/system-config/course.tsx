import { createFileRoute } from '@tanstack/react-router'
import { ConfigList } from '@/features/system-config/pages/config-list'

export const Route = createFileRoute('/_authenticated/system-config/course')({
  component: () => (
    <ConfigList
      configGroup='course'
      title='课程时间表配置'
      description='管理课程时间表相关的配置参数'
    />
  ),
})

