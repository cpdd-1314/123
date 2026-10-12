import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { StarRating, StarRatingInput } from './StarRating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { RatingItem, RatingSummary } from '@/types/players'

/**
 * 星级评价区（陪玩 / 俱乐部通用）
 * 每位访客仅可评价一次，已评价后展示结果
 */
export default function RatingSection({
  targetName,
  summary,
  items,
  rated,
  onSubmit,
  isSubmitting,
  error,
}: {
  targetName: string
  summary?: RatingSummary
  items?: RatingItem[]
  rated?: boolean
  onSubmit: (stars: number, comment: string) => void
  isSubmitting: boolean
  error?: string
}) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  const canSubmit = stars > 0 && !isSubmitting && !rated
  const dist = summary?.distribution ?? {}

  return (
    <div className="border-t border-border/60 px-6 py-5">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-muted-foreground">
        <MessageSquare className="size-3.5" />
        综合评分
      </h2>

      {/* 汇总 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="font-[Russo_One,sans-serif] text-3xl text-warning">
            {(summary?.average ?? 0).toFixed(1)}
          </span>
          <div>
            <StarRating value={summary?.average ?? 0} size={16} />
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              共 {summary?.count ?? 0} 人评价
            </p>
          </div>
        </div>

        {/* 分布条 */}
        <div className="min-w-[180px] flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const c = dist[String(star)] ?? 0
            const total = summary?.count ?? 0
            const pct = total > 0 ? (c / total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-6 shrink-0">{star} 星</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-warning transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right">{c}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 评价表单 / 已评价提示 */}
      {rated ? (
        <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
          感谢您的评价！每位访客只能评价一次 {targetName}。
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-4">
          <p className="text-xs font-medium text-foreground">给 {targetName} 打个分</p>
          <div className="mt-2.5 flex items-center gap-3">
            <StarRatingInput value={stars} onChange={setStars} disabled={isSubmitting} />
            {stars > 0 && (
              <span className="text-xs text-muted-foreground">
                {['', '很差', '一般', '还行', '不错', '超赞'][stars]}
              </span>
            )}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="说点什么吧（可选，最多 200 字）"
            maxLength={200}
            rows={2}
            className="mt-3 resize-none text-xs"
            disabled={isSubmitting}
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-3 flex items-center justify-end">
            <Button size="sm" disabled={!canSubmit} onClick={() => onSubmit(stars, comment)}>
              <Send className="mr-1.5 size-3.5" />
              {isSubmitting ? '提交中…' : '提交评价'}
            </Button>
          </div>
        </div>
      )}

      {/* 评价列表 */}
      {(items?.length ?? 0) > 0 && (
        <ul className="mt-4 space-y-3">
          {items!.map((item) => (
            <li key={item.id} className="rounded-lg border border-border/50 bg-card/50 px-3.5 py-3">
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
    </div>
  )
}
