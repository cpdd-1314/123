import { useState } from 'react'
import { Building2, Send, Users } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { StarRating, StarRatingInput } from './StarRating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useClub, useSubmitClubRating } from '@/hooks/use-club'
import { getErrorMessage } from '@/lib/api-client'

/** 首页俱乐部名片 + 星级评价 */
export default function ClubCard() {
  const { data: club } = useClub()
  const submit = useSubmitClubRating()
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  if (!club) return null

  const rated = club.rated
  const rating = club.rating
  const canSubmit = stars > 0 && !submit.isPending && !rated

  const handleSubmit = () => {
    submit.mutate(
      { stars, comment },
      {
        onSuccess: () => {
          setStars(0)
          setComment('')
        },
      }
    )
  }

  return (
    <FadeIn className="mt-12">
      <section className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-info/5">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          {/* 左：信息 */}
          <div className="flex flex-1 items-start gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-1.5 rounded-2xl bg-primary/25 blur-lg" />
              {club.avatar ? (
                <img
                  src={club.avatar}
                  alt={club.name}
                  className="relative size-16 rounded-2xl border-2 border-primary/50 object-cover"
                />
              ) : (
                <div className="relative flex size-16 items-center justify-center rounded-2xl border-2 border-primary/50 bg-card">
                  <Building2 className="size-7 text-primary" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{club.name}</h2>
                <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                  <Users className="size-3" />
                  {club.memberCount} 位成员
                </span>
              </div>
              {club.slogan && <p className="mt-1 text-xs text-primary">{club.slogan}</p>}
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {club.description}
              </p>
            </div>
          </div>

          {/* 右：评分 */}
          <div className="w-full shrink-0 rounded-xl border border-border/60 bg-background/40 p-4 lg:w-80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-[Russo_One,sans-serif] text-3xl text-warning">
                  {rating.average.toFixed(1)}
                </span>
                <div>
                  <StarRating value={rating.average} size={15} />
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {rating.count > 0 ? `${rating.count} 人评价` : '暂无评价'}
                  </p>
                </div>
              </div>
            </div>

            {rated ? (
              <p className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[11px] text-success">
                感谢您为俱乐部评分！
              </p>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <StarRatingInput value={stars} onChange={setStars} size={22} disabled={submit.isPending} />
                  <Button size="sm" disabled={!canSubmit} onClick={handleSubmit} className="shrink-0">
                    <Send className="mr-1 size-3" />
                    {submit.isPending ? '提交中' : '评分'}
                  </Button>
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="对俱乐部的评价（可选）"
                  maxLength={200}
                  rows={2}
                  className="mt-2 resize-none text-xs"
                  disabled={submit.isPending}
                />
                {submit.isError && (
                  <p className="mt-1.5 text-[11px] text-destructive">{getErrorMessage(submit.error)}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </FadeIn>
  )
}
