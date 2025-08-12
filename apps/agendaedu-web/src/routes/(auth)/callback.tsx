import { createFileRoute } from '@tanstack/react-router'
import { AuthCallback } from '@/features/auth/pages/auth-callback'

export const Route = createFileRoute('/(auth)/callback')({
  component: AuthCallback,
})
