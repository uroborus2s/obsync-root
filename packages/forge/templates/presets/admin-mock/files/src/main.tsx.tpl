import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'

import { createAppQueryClient } from '@/app/query-client'
import { AuthProvider } from '@/app/providers/auth-provider'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { enableMocking } from '@/mocks'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './index.css'

const queryClient = createAppQueryClient()

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

async function bootstrap() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK === 'true') {
    await enableMocking()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
