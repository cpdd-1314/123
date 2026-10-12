import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 只读星级展示（支持小数，按百分比裁剪显示） */
export function StarRating({
  value,
  size = 14,
  className,
  showValue = false,
  count,
}: {
  value: number
  size?: number
  className?: string
  showValue?: boolean
  count?: number
}) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100))

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="relative inline-flex" style={{ height: size }}>
        {/* 底层灰星 */}
        <span className="inline-flex text-muted-foreground/35">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} style={{ width: size, height: size }} strokeWidth={1.5} />
          ))}
        </span>
        {/* 上层亮星（按比例裁剪） */}
        <span
          className="absolute inset-0 inline-flex overflow-hidden text-warning"
          style={{ width: `${percent}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              style={{ width: size, height: size, minWidth: size }}
              className="fill-warning"
              strokeWidth={1.5}
            />
          ))}
        </span>
      </span>
      {(showValue || count !== undefined) && (
        <span className="text-xs text-muted-foreground">
          {showValue && <span className="font-medium text-foreground">{value.toFixed(1)}</span>}
          {count !== undefined && <span>（{count} 人评价）</span>}
        </span>
      )}
    </span>
  )
}

/** 可交互星级评分输入 */
export function StarRatingInput({
  value,
  onChange,
  size = 28,
  disabled = false,
}: {
  value: number
  onChange: (v: number) => void
  size?: number
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="星级评分">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1
        const on = star <= active
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} 星`}
            disabled={disabled}
            className={cn(
              'transition-transform duration-150',
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-115 cursor-pointer'
            )}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => !disabled && setHover(0)}
            onClick={() => !disabled && onChange(star)}
          >
            <Star
              style={{ width: size, height: size }}
              strokeWidth={1.5}
              className={cn(
                on ? 'fill-warning text-warning' : 'text-muted-foreground/40',
                on && 'drop-shadow-[0_0_6px_oklch(0.78_0.16_85/0.6)]'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
