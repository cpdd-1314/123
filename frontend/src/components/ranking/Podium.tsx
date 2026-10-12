import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, Star } from 'lucide-react'
import { staggerContainer, fadeUp } from '@/components/MotionPrimitives'
import type { Player } from '@/types/players'

// 视觉排列：亚军、冠军、季军（1~2 人时在组件内动态生成）

const HEIGHTS = ['h-44 sm:h-52', 'h-56 sm:h-72', 'h-36 sm:h-44']

/** TOP3 领奖台（支持 1~3 人：不足 3 人时按现有名次动态布局） */
export default function Podium({ topThree }: { topThree: Player[] }) {
  if (topThree.length === 0) return null

  const order = topThree.length === 1 ? [0] : topThree.length === 2 ? [1, 0] : [1, 0, 2]
  const heights =
    topThree.length === 1
      ? [HEIGHTS[1]]
      : topThree.length === 2
        ? [HEIGHTS[0], HEIGHTS[1]]
        : HEIGHTS

  return (
    <motion.div
      variants={staggerContainer(0.15)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="flex items-end justify-center gap-3 sm:gap-6"
    >
      {order.map((idx, slot) => {
        const player = topThree[idx]
        if (!player) return null
        const rank = idx + 1
        const isChampion = rank === 1
        const stepHeight = heights[slot]

        return (
          <motion.div
            key={player.id}
            variants={fadeUp}
            className="flex w-28 flex-col items-center sm:w-40"
          >
            {/* 头像 */}
            <Link to={`/player/${player.id}`} className="group relative">
              <div
                className={
                  isChampion
                    ? 'absolute -inset-2 rounded-full bg-primary/30 blur-lg'
                    : 'absolute -inset-1.5 rounded-full bg-primary/15 blur-md'
                }
              />
              <img
                src={player.avatar}
                alt={`${player.nickname}的头像`}
                className={cnAvatar(isChampion)}
              />
              {isChampion && (
                <Crown className="absolute -top-6 left-1/2 size-7 -translate-x-1/2 fill-warning text-warning drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
              <span
                className={
                  isChampion
                    ? 'absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 px-2 py-0.5 text-xs font-bold text-amber-950'
                    : 'absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-bold text-muted-foreground'
                }
              >
                NO.{rank}
              </span>
            </Link>

            {/* 昵称与热度 */}
            <Link to={`/player/${player.id}`} className="mt-4 text-center">
              <p
                className={
                  isChampion
                    ? 'truncate text-base font-bold text-warning'
                    : 'truncate text-sm font-bold text-foreground'
                }
              >
                {player.nickname}
              </p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <Star className="size-3 fill-warning text-warning" />
                {player.rating.toFixed(1)} · {player.game}
              </p>
            </Link>

            {/* 台阶 */}
            <div
              className={
                'mt-3 flex w-full flex-col items-center justify-start rounded-t-xl border border-border bg-gradient-to-t ' +
                (isChampion
                  ? 'from-primary/25 to-primary/5 border-primary/40 shadow-[0_0_30px_oklch(0.55_0.28_290/0.35)] '
                  : 'from-secondary/80 to-secondary/20 ') +
                stepHeight
              }
            >
              <span
                className={
                  isChampion
                    ? 'mt-3 font-[Russo_One,sans-serif] text-4xl text-primary'
                    : 'mt-3 font-[Russo_One,sans-serif] text-2xl text-muted-foreground'
                }
              >
                {rank}
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                热度 {player.score.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

function cnAvatar(isChampion: boolean): string {
  const base = 'relative rounded-2xl border-2 object-cover transition-transform duration-300 group-hover:scale-105 '
  return base + (isChampion ? 'size-24 border-warning/70 sm:size-28' : 'size-20 border-border sm:size-24')
}
