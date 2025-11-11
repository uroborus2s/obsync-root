import { createFileRoute } from '@tanstack/react-router'
import CourseManagement from '@/features/attendance/components/course-management'

/**
 * 课程管理页面路由
 */
export const Route = createFileRoute('/_authenticated/course-management')({
  component: CourseManagement,
})

