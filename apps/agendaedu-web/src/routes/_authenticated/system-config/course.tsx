import { createFileRoute } from '@tanstack/react-router'
import { CoursePeriodConfig } from '@/features/system-config/pages/course-period-config'

export const Route = createFileRoute('/_authenticated/system-config/course')({
  component: CoursePeriodConfig,
})
