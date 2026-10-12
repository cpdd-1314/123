import { Link, useLocation } from 'react-router-dom'
import { Gamepad2, LayoutDashboard, Trophy, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 顶部导航栏（放在 AnimatedRoutes 外部） */
export default function Navbar({ realtimeConnected = false }: { realtimeConnected?: boolean }) {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const isPlayer = pathname.startsWith('/player/') || pathname.startsWith('/player-center')

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative flex size-9 items-center justify-center rounded-lg bg-primary shadow-[0_0_16px_oklch(0.55_0.28_290/0.6)]">
            <Trophy className="size-5 text-primary-foreground" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-wide text-foreground">
              𝓮𝓵𝓮𝓿𝓮𝓷<span className="text-primary">十一愿</span>club
            </span>
            <span className="mt-0.5 text-[10px] tracking-[0.3em] text-muted-foreground">ELEVEN CLUB</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {/* 实时同步状态指示 */}
          <span
            title={realtimeConnected ? '实时同步已连接' : '实时同步断开，正在重连...'}
            className="mr-2 hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground sm:flex"
          >
            <span
              className={
                realtimeConnected
                  ? 'size-1.5 animate-pulse rounded-full bg-success shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : 'size-1.5 rounded-full bg-muted-foreground'
              }
            />
            {realtimeConnected ? 'LIVE' : '重连中'}
          </span>
          <Link
            to="/"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
              !isAdmin && !isPlayer
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Gamepad2 className="size-4" />
            排行榜
          </Link>
          <Link
            to="/player-center"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
              isPlayer
                ? 'bg-info/15 text-info'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <UserCircle className="size-4" />
            陪玩中心
          </Link>
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
              isAdmin
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <LayoutDashboard className="size-4" />
            后台管理
          </Link>
        </div>
      </nav>
    </header>
  )
}
