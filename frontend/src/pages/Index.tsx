import { useMemo, useState } from 'react'
import { CalendarDays, Swords, Trophy } from 'lucide-react'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import FilterBar from '@/components/ranking/FilterBar'
import HeroStats from '@/components/ranking/HeroStats'
import ClubCard from '@/components/ranking/ClubCard'
import Podium from '@/components/ranking/Podium'
import PlayerCard from '@/components/ranking/PlayerCard'
import { useHistoryPlayers, usePlayers, useStats } from '@/hooks/use-players'
import type { Player, PlayerQuery } from '@/types/players'

type BoardMode = 'live' | 'weekly' | 'monthly'

const BOARD_TABS: Array<{ value: BoardMode; label: string; icon: typeof Trophy }> = [
  { value: 'live', label: '实时榜', icon: Swords },
  { value: 'weekly', label: '上周最佳', icon: Trophy },
  { value: 'monthly', label: '上月最佳', icon: CalendarDays },
]

export default function Index() {
  const [mode, setMode] = useState<BoardMode>('live')
  const [query, setQuery] = useState<PlayerQuery>({ sort: 'score', order: 'desc' })
  const { data: players, isLoading } = usePlayers(query)
  const { data: stats } = useStats()

  // 历史榜：仅 weekly / monthly 模式下拉取
  const { data: history, isLoading: historyLoading } = useHistoryPlayers(mode === 'live' ? null : mode)
  const isHistory = mode !== 'live'

  // 历史快照行 → Player 形状（复用领奖台与卡片组件）
  const historyPlayers = useMemo<Player[]>(
    () =>
      (history?.list ?? [])
        .filter((r) => Number.isFinite(r.playerId))
        .map((r) => ({
          id: r.playerId,
          nickname: r.nickname,
          avatar: r.avatar,
          game: r.game,
          tags: [],
          description: '',
          pricePerHour: 0,
          rating: r.rating,
          orders: r.orders,
          score: r.score,
          status: 'active',
          isPinned: false,
          reviewCount: 0,
          reviewAverage: 0,
          createdAt: '',
          updatedAt: '',
        })),
    [history]
  )

  const boardPlayers = isHistory ? historyPlayers : (players ?? [])
  const boardLoading = isHistory ? historyLoading : isLoading

  const isFiltered = !isHistory && (!!query.game || !!query.keyword)
  // 领奖台最多 3 人；榜单不足 3 人时全部进领奖台，剩余进列表
  const podiumCount = Math.min(3, boardPlayers.length)
  const topThree = useMemo(() => boardPlayers.slice(0, podiumCount), [boardPlayers, podiumCount])
  const rest = useMemo(() => boardPlayers.slice(podiumCount), [boardPlayers, podiumCount])

  return (
    <div className="relative min-h-screen">
      {/* 背景霓虹光斑 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 size-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute right-1/4 top-64 size-80 rounded-full bg-info/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-destructive/10 blur-[120px]" />
      </div>

      <main className="container relative mx-auto px-4 pb-16 pt-10">
        {/* Hero */}
        <FadeIn className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Swords className="size-3.5" />
            实时战力榜单 · 每日更新
          </span>
          <h1
            className="mt-4 font-[Russo_One,sans-serif] text-4xl leading-tight text-foreground sm:text-5xl"
            style={{ textShadow: '0 0 32px oklch(0.55 0.28 290 / 0.45)' }}
          >
            𝓮𝓵𝓮𝓿𝓮𝓷<span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">十一愿club</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            按实力与口碑排名的电竞陪玩排行榜 —— 找到你的专属队友，愉快上分。
          </p>
        </FadeIn>

        <div className="mt-8">
          <HeroStats stats={stats} />
        </div>

        {/* 俱乐部名片 + 评分 */}
        <ClubCard />

        {/* 榜单模式切换：实时榜 / 上周最佳 / 上月最佳 */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card/60 p-1 backdrop-blur-sm">
            {BOARD_TABS.map((t) => {
              const active = mode === t.value
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  onClick={() => setMode(t.value)}
                  className={
                    'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ' +
                    (active
                      ? 'bg-primary text-primary-foreground shadow-[0_0_16px_oklch(0.55_0.28_290/0.45)]'
                      : 'text-muted-foreground hover:text-foreground')
                  }
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* TOP3 领奖台（无筛选时展示；榜单不足 3 人时展示现有全部） */}
        {!isFiltered && topThree.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 text-center text-sm font-semibold tracking-[0.4em] text-muted-foreground">
              {isHistory
                ? mode === 'weekly'
                  ? '上周最佳 · 荣耀殿堂'
                  : '上月最佳 · 荣耀殿堂'
                : topThree.length >= 3
                  ? 'TOP 3 荣耀殿堂'
                  : '荣耀榜单'}
            </h2>
            <Podium topThree={topThree} />
            {isHistory && history?.periodStart && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                统计周期：{history.periodStart} 起的{mode === 'weekly' ? '一周' : '一个月'} · 快照于周期结束时生成
              </p>
            )}
          </section>
        )}

        {/* 工具栏（仅实时榜显示筛选） */}
        {!isHistory && (
          <div className="mt-12">
            <FilterBar query={query} onChange={setQuery} />
          </div>
        )}

        {/* 榜单列表（全员都在领奖台时不再重复展示） */}
        <section className="mt-6">
          {boardLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-card/60" />
              ))}
            </div>
          ) : boardPlayers.length > 0 && (isFiltered ? players!.length > 0 : rest.length > 0) ? (
            <Stagger stagger={0.05} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(isFiltered ? players! : rest).map((player, i) => (
                <PlayerCard key={player.id} player={player} rank={isFiltered ? i + 1 : i + 4} />
              ))}
            </Stagger>
          ) : boardPlayers.length > 0 ? (
            // 榜单有数据但全部在领奖台展示，无需列表
            null
          ) : (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {isHistory
                  ? `暂无${mode === 'weekly' ? '上周' : '上月'}榜单快照，周期结束后自动生成`
                  : '暂无陪玩上榜，请先在后台添加'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
