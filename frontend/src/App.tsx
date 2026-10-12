import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AnimatedRoutes } from '@/components/AnimatedRoutes'
import { PageTransition } from '@/components/PageTransition'
import Navbar from '@/components/layout/Navbar'
import { useRealtimeSync } from '@/hooks/use-realtime'
import Index from './pages/Index'
import PlayerDetail from './pages/PlayerDetail'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import PlayerLogin from './pages/player/PlayerLogin'
import PlayerPortal from './pages/player/PlayerPortal'
import NotFound from './pages/NotFound'

/**
 * Configure TanStack Query client with optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 1 minute
      staleTime: 60 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}

/** 需要在 QueryClientProvider 内部才能使用 useQueryClient 的实时同步 */
function AppInner() {
  // 全局实时同步：后台数据变更 → 前台自动刷新
  const { connected } = useRealtimeSync()

  return (
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        {/* 共享导航放在 AnimatedRoutes 外部 */}
        <Navbar realtimeConnected={connected} />
        <AnimatedRoutes>
          <Route path="/" element={<PageTransition transition="slide-up"><Index /></PageTransition>} />
          <Route path="/player/:id" element={<PageTransition transition="fade"><PlayerDetail /></PageTransition>} />
          <Route path="/admin/login" element={<PageTransition transition="fade"><AdminLogin /></PageTransition>} />
          <Route path="/admin" element={<PageTransition transition="slide-fade"><AdminDashboard /></PageTransition>} />
          <Route path="/player/login" element={<PageTransition transition="fade"><PlayerLogin /></PageTransition>} />
          <Route path="/player-center" element={<PageTransition transition="slide-fade"><PlayerPortal /></PageTransition>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<PageTransition transition="fade"><NotFound /></PageTransition>} />
        </AnimatedRoutes>
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
