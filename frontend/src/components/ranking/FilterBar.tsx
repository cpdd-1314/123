import { ArrowDownUp, Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GAME_OPTIONS, SORT_LABELS, type PlayerQuery } from '@/types/players'
import { cn } from '@/lib/utils'

const SORTS: Array<{ value: NonNullable<PlayerQuery['sort']>; label: string }> = [
  { value: 'score', label: '热度' },
  { value: 'rating', label: '评分' },
  { value: 'orders', label: '人气' },
  { value: 'price', label: '单价' },
]

/** 筛选 / 排序 / 搜索工具栏 */
export default function FilterBar({
  query,
  onChange,
}: {
  query: PlayerQuery
  onChange: (q: PlayerQuery) => void
}) {
  const set = (patch: Partial<PlayerQuery>) => onChange({ ...query, ...patch })

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
      {/* 游戏筛选 */}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={!query.game} onClick={() => set({ game: undefined })}>
          全部
        </FilterChip>
        {GAME_OPTIONS.map((game) => (
          <FilterChip
            key={game}
            active={query.game === game}
            onClick={() => set({ game: query.game === game ? undefined : game })}
          >
            {game}
          </FilterChip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* 搜索 */}
        <div className="relative flex-1 lg:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query.keyword ?? ''}
            onChange={(e) => set({ keyword: e.target.value || undefined })}
            placeholder="搜索昵称 / 标签 / 简介"
            className="h-9 w-full rounded-lg border border-input bg-background/60 pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </div>

        {/* 排序 */}
        <Select
          value={query.sort ?? 'score'}
          onValueChange={(v) => set({ sort: v as PlayerQuery['sort'] })}
        >
          <SelectTrigger className="h-9 w-auto gap-1.5 border-input bg-background/60 text-sm">
            <ArrowDownUp className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                按{SORT_LABELS[s.value]}排序
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 升降序 */}
        <button
          onClick={() => set({ order: query.order === 'asc' ? 'desc' : 'asc' })}
          title={query.order === 'asc' ? '当前升序，点击切换降序' : '当前降序，点击切换升序'}
          className="flex h-9 items-center gap-1 rounded-lg border border-input bg-background/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ArrowDownUp className={cn('size-3.5 transition-transform', query.order === 'asc' && 'rotate-180')} />
          {query.order === 'asc' ? '升序' : '降序'}
        </button>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
        active
          ? 'bg-primary text-primary-foreground shadow-[0_0_12px_oklch(0.55_0.28_290/0.5)]'
          : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
