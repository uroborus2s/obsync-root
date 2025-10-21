import { CourseRestorePage } from '@/features/workflows/pages/course-restore-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/workflows/course-restore')({
  component: CourseRestorePage,
})