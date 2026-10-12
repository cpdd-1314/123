import { Navigate, useNavigate } from 'react-router-dom'
import { Clock, Flame, LogOut, Star, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FadeIn } from '@/components/MotionPrimitives'
import { StarRating } from '@/components/ranking/StarRating'
import { usePlayerAuth, usePlayerLogout } from '@/hooks/use-player-portal'

/** 陪玩个人中心：查看自己的资料、热度与收到的评价 */
export default function PlayerPortal() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = usePlayerAuth()
  const logoutMutation = usePlayerLogout()

  if (!isLoading && (isError || !data)) {
    return <Navigate to="/player/login" replace />
  }

  if (isLoading || !data) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const { player, account, reviews } = data

  const handleLogout = async () => {
    await logoutMutation.mutateAsync()
    toast.success('已退出登录')
    navigate('/player/login', { replace: true })
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <FadeIn className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">陪玩个人中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">当前账号：{account.username}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} disabled={logoutMutation.isPending}>
          <LogOut className="size-4" />
          退出登录
        </Button>
      </FadeIn>

      {/* 资料卡 */}
      <FadeIn className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-primary/15 to-transparent px-6 py-7 sm:flex-row">
          <img
            src={player.avatar}
            alt={player.nickname}
            className="size-20 rounded-2xl border-2 border-primary/50 object-cover"
          />
          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-bold text-foreground">{player.nickname}</h2>
              <Badge
                variant="outline"
                className={
                  player.status === 'active'
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-border bg-muted text-muted-foreground'
                }
              >
                {player.status === 'active' ? '已上架' : '已下架'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {player.game} · {player.tags.join(' / ') || '无标签'}
            </p>
          </div>
        </div>

        {/* 数据 */}
        <div className="grid grid-cols-3 gap-px border-t border-border/60 bg-border/60">
          <Cell icon={Flame} label="热度积分" value={player.score.toLocaleString()} />
          <Cell icon={Star} label="综合星级" value={reviews.summary.average.toFixed(1)} />
          <Cell icon={Clock} label="时价" value={`¥${player.pricePerHour}`} />
        </div>

        {player.description && (
          <div className="border-t border-border/60 px-6 py-4">
            <p className="text-xs leading-relaxed text-foreground/85">{player.description}</p>
          </div>
        )}
      </FadeIn>

      {/* 收到的评价 */}
      <FadeIn className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <User className="size-4 text-primary" />
            收到的评价
          </h2>
          <div className="flex items-center gap-2">
            <StarRating value={reviews.summary.average} size={15} />
            <span className="text-xs text-muted-foreground">共 {reviews.summary.count} 条</span>
          </div>
        </div>

        {reviews.items.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
            还没有收到评价，加油表现吧！
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reviews.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-border/50 bg-background/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <StarRating value={item.stars} size={13} />
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {item.comment && (
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">{item.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </FadeIn>
    </div>
  )
}

function Cell({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-4 text-center">
      <Icon className="mx-auto size-4 text-primary" />
      <p className="mt-1.5 font-[Russo_One,sans-serif] text-xl text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
