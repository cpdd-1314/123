import { Flame, Star, Users, Wifi } from 'lucide-react'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUp } from '@/components/MotionPrimitives'
import CountUp from '@/components/reactbits/CountUp'
import type { PlayerStats } from '@/types/players'

/** Hero 区域实时统计（数字滚动） */
export default function HeroStats({ stats }: { stats?: PlayerStats }) {
  const items = [
    { icon: Users, label: '在榜陪玩', value: stats?.totalPlayers ?? 0, suffix: ' 位' },
    { icon: Wifi, label: '在线', value: stats?.onlinePlayers ?? 0, suffix: ' 人' },
    { icon: Flame, label: '总热度', value: stats?.totalOrders ?? 0, suffix: '' },
    { icon: Star, label: '平均评分', value: stats?.avgRating ?? 0, decimals: 1, suffix: ' 分' },
  ]

  return (
    <motion.div
      variants={staggerContainer(0.12)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {items.map(({ icon: Icon, label, value, suffix, decimals }) => (
        <motion.div
          key={label}
          variants={fadeUp}
          className="rounded-xl border border-border bg-card/70 px-4 py-3 text-center backdrop-blur-sm"
        >
          <Icon className="mx-auto size-5 text-primary" />
          <p className="mt-1.5 font-[Russo_One,sans-serif] text-2xl text-foreground">
            <CountUp to={value} decimals={decimals ?? 0} suffix={suffix} duration={1.6} />
          </p>
          <p className="mt-0.5 text-[11px] tracking-widest text-muted-foreground">{label}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}
