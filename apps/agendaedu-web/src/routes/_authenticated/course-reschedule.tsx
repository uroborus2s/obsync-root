import { createFileRoute } from '@tanstack/react-router'
import CourseReschedule from '@/features/attendance/components/course-reschedule'

/**
 * 课程调串课页面路由
 */
export const Route = createFileRoute('/_authenticated/course-reschedule')({
  component: CourseReschedule,
})

