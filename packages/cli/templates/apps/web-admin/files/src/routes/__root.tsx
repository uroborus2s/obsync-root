import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import GeneralError from '@/features/errors/pages/general-error'
import NotFoundError from '@/features/errors/pages/not-found-error'
import { NavigationProgress } from '@/components/shared/navigation-progress'
import { SkipToMain } from '@/components/shared/skip-to-main'
import { Toaster } from '@/components/ui/sonner'

export interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <NavigationProgress />
      <SkipToMain />
      <Outlet />
      <Toaster position='top-right' richColors />
      {import.meta.env.MODE === 'development' && (
        <>
          <TanStackRouterDevtools position='bottom-right' />
          <ReactQueryDevtools buttonPosition='bottom-left' />
        </>
      )}
    </>
  ),
  errorComponent: GeneralError,
  notFoundComponent: NotFoundError,
})
