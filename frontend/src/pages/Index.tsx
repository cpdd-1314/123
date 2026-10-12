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

  /** 由周期起点 + 类型推算可读的日期区间（周：周一~周日；月：1 号~月末） */
  const periodRange = useMemo(() => {
    const start = history?.periodStart
    if (!start) return ''
    const d = new Date(start + 'T00:00:00Z')
    let end: Date
    if (mode === 'weekly') {
      end = new Date(d)
      end.setUTCDate(end.getUTCDate() + 6)
    } else {
      end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
    }
    const fmt = (x: Date) =>
      `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
    return `${fmt(d)} ~ ${fmt(end)}`
  }, [history?.periodStart, mode])

  // 领奖台仅在前端未筛选且人数 > 3 时展示；列表始终展示完整名册，避免人数少时空白
  const showPodium = !isFiltered && boardPlayers.length > 3
  const podiumPlayers = useMemo<Player[]>(
    () => (showPodium ? boardPlayers.slice(0, 3) : []),
    [showPodium, boardPlayers]
  )
  const listPlayers = useMemo<Player[]>(
    () => (isFiltered ? boardPlayers : boardPlayers.slice(showPodium ? 3 : 0)),
    [isFiltered, showPodium, boardPlayers]
  )
  const startRank = isFiltered ? 1 : showPodium ? 4 : 1

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
        <div className="mt-10 flex max-w-full justify-center px-2">
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-card/60 p-1 backdrop-blur-sm sm:gap-1">
            {BOARD_TABS.map((t) => {
              const active = mode === t.value
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  onClick={() => setMode(t.value)}
                  className={
                    'inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:gap-1.5 sm:px-4 sm:text-sm ' +
                    (active
                      ? 'bg-primary text-primary-foreground shadow-[0_0_16px_oklch(0.55_0.28_290/0.45)]'
                      : 'text-muted-foreground hover:text-foreground')
                  }
                >
                  <Icon className="size-3.5 sm:size-4" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 历史榜统计周期日期区间（始终展示） */}
        {isHistory && periodRange && (
          <div className="mt-6 flex max-w-full justify-center px-4">
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-full border border-border bg-card/60 px-4 py-1.5 text-center text-xs text-muted-foreground backdrop-blur-sm">
              <CalendarDays className="size-3.5 shrink-0" />
              {mode === 'weekly' ? '上周最佳' : '上月最佳'}统计周期：
              <span className="whitespace-nowrap font-medium text-foreground">{periodRange}</span>
            </span>
          </div>
        )}

        {/* TOP3 领奖台（未筛选且人数 > 3 时展示） */}
        {showPodium && podiumPlayers.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 text-center text-sm font-semibold tracking-[0.4em] text-muted-foreground">
              {isHistory
                ? mode === 'weekly'
                  ? '上周最佳 · 荣耀殿堂'
                  : '上月最佳 · 荣耀殿堂'
                : 'TOP 3 荣耀殿堂'}
            </h2>
            <Podium topThree={podiumPlayers} />
          </section>
        )}

        {/* 工具栏（仅实时榜显示筛选） */}
        {!isHistory && (
          <div className="mt-12">
            <FilterBar query={query} onChange={setQuery} />
          </div>
        )}

        {/* 榜单列表：始终展示完整名册 */}
        <section className="mt-6">
          {boardLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-card/60" />
              ))}
            </div>
          ) : boardPlayers.length > 0 ? (
            <Stagger stagger={0.05} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listPlayers.map((player, i) => (
                <PlayerCard key={player.id} player={player} rank={startRank + i} />
              ))}
            </Stagger>
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
