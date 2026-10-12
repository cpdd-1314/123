import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, Flame, Pin, Star } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import RatingSection from '@/components/ranking/RatingSection'
import { usePlayer } from '@/hooks/use-players'
import { usePlayerRatings, useSubmitPlayerRating } from '@/hooks/use-ratings'
import { getErrorMessage } from '@/lib/api-client'

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const playerId = Number(id)
  const { data: player, isLoading, isError } = usePlayer(playerId)
  const { data: ratingData } = usePlayerRatings(playerId)
  const submitRating = useSubmitPlayerRating()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl border border-border bg-card/60" />
      </div>
    )
  }

  if (isError || !player) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">陪玩不存在或已下架</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          返回排行榜
        </Link>
      </div>
    )
  }

  const handleSubmit = (stars: number, comment: string) => {
    submitRating.mutate({ playerId, stars, comment })
  }

  return (
    <div className="container relative mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        返回排行榜
      </Link>

      <FadeIn className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {/* 头部 */}
        <div className="relative flex flex-col items-center gap-4 border-b border-border/60 bg-gradient-to-b from-primary/15 to-transparent px-6 py-8 sm:flex-row sm:items-end">
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-primary/25 blur-lg" />
            <img
              src={player.avatar}
              alt={`${player.nickname}的头像`}
              className="relative size-28 rounded-2xl border-2 border-primary/50 object-cover"
            />
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold text-foreground">{player.nickname}</h1>
              {player.isPinned && (
                <span className="flex items-center gap-1 rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Pin className="size-3" />
                  置顶推荐
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {player.game} · 入驻于 {new Date(player.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>

        {/* 数据面板 */}
        <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-3">
          <StatCell icon={Star} label="综合评分" value={(ratingData?.summary.average ?? player.reviewAverage).toFixed(1)} highlight />
          <StatCell icon={Flame} label="热度积分" value={player.score.toLocaleString()} highlight />
          <StatCell icon={Clock} label="时价" value={`¥${player.pricePerHour}`} />
        </div>

        {/* 标签 */}
        <div className="px-6 py-5">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">技能标签</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {player.tags.length > 0 ? (
              player.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">暂无标签</span>
            )}
          </div>
        </div>

        {/* 简介 */}
        <div className="border-t border-border/60 px-6 py-5">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">个人简介</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {player.description || '这位陪玩还没有留下简介。'}
          </p>
        </div>

        {/* 星级评价 */}
        <RatingSection
          targetName="这位陪玩"
          summary={ratingData?.summary}
          items={ratingData?.items}
          rated={ratingData?.rated}
          onSubmit={handleSubmit}
          isSubmitting={submitRating.isPending}
          error={submitRating.isError ? getErrorMessage(submitRating.error) : undefined}
        />

        {/* 底部信息 */}
        <div className="flex items-center justify-between border-t border-border/60 px-6 py-4">
          <span className="text-xs text-muted-foreground">
            资料更新于 {new Date(player.updatedAt).toLocaleString('zh-CN')}
          </span>
          <span className="text-xs text-muted-foreground">数据由后台维护</span>
        </div>
      </FadeIn>
    </div>
  )
}

function StatCell({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Star
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="bg-card px-4 py-4 text-center">
      <Icon className={`mx-auto size-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      <p className={`mt-1.5 font-[Russo_One,sans-serif] text-xl ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
