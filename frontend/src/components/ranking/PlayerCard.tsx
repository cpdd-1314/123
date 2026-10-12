import { Link } from 'react-router-dom'
import { Clock, Flame, Pin, ShoppingBag, Star } from 'lucide-react'
import { HoverLift } from '@/components/MotionPrimitives'
import RankBadge from './RankBadge'
import { cn } from '@/lib/utils'
import type { Player } from '@/types/players'

/** 榜单陪玩卡片 */
export default function PlayerCard({ player, rank }: { player: Player; rank: number }) {
  return (
    <HoverLift className="h-full">
      <Link
        to={`/player/${player.id}`}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors duration-300',
          'hover:border-primary/60 hover:shadow-[0_0_24px_oklch(0.55_0.28_290/0.25)]'
        )}
      >
        {/* 置顶标记 */}
        {player.isPinned && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Pin className="size-3" />
            置顶
          </span>
        )}

        <div className="flex items-start gap-3">
          <div className="relative">
            <img
              src={player.avatar}
              alt={`${player.nickname}的头像`}
              loading="lazy"
              className="size-16 rounded-xl border border-border object-cover"
            />
            <span
              className={cn(
                'absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-card',
                player.isOnline ? 'bg-success' : 'bg-muted-foreground'
              )}
              title={player.isOnline ? '在线接单中' : '离线'}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <RankBadge rank={rank} />
              <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary" style={{ transition: 'var(--duration-fast) var(--ease-default)' }}>
                {player.nickname}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{player.game}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {player.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
          {player.description || '这位陪玩还没有留下简介。'}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-warning text-warning" />
              <span className="font-semibold text-foreground">{player.rating.toFixed(1)}</span>
            </span>
            <span className="flex items-center gap-1">
              <ShoppingBag className="size-3.5" />
              {player.orders}
            </span>
            <span className="flex items-center gap-1 text-primary">
              <Flame className="size-3.5" />
              {player.score.toLocaleString()}
            </span>
          </div>
          <span className="flex items-center gap-0.5 text-sm font-bold text-foreground">
            <Clock className="size-3.5 text-muted-foreground" />¥{player.pricePerHour}
            <span className="text-[11px] font-normal text-muted-foreground">/时</span>
          </span>
        </div>
      </Link>
    </HoverLift>
  )
}
