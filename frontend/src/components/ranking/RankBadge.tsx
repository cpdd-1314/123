import { Crown, Medal } from 'lucide-react'
import { cn } from '@/lib/utils'

const RANK_STYLES: Record<number, string> = {
  1: 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.55)]',
  2: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-[0_0_14px_rgba(203,213,225,0.45)]',
  3: 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950 shadow-[0_0_14px_rgba(251,146,60,0.45)]',
}

/** 排名徽章：1/2/3 名金银铜，其余为名次数字 */
export default function RankBadge({ rank, className }: { rank: number; className?: string }) {
  if (rank <= 3) {
    return (
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          RANK_STYLES[rank],
          className
        )}
        title={`第 ${rank} 名`}
      >
        {rank === 1 ? <Crown className="size-4" /> : <Medal className="size-4" />}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/70 text-sm font-semibold text-muted-foreground',
        className
      )}
    >
      {rank}
    </span>
  )
}
