import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface CountUpProps {
  to: number
  from?: number
  duration?: number
  decimals?: number
  separator?: string
  className?: string
  suffix?: string
  prefix?: string
}

/**
 * CountUp — 数字滚动动画（ReactBits 风格）
 * 进入视口后从 from 滚动到 to
 */
export default function CountUp({
  to,
  from = 0,
  duration = 2,
  decimals = 0,
  separator = ',',
  className,
  suffix = '',
  prefix = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const [value, setValue] = useState(from)

  useEffect(() => {
    if (!inView) return

    let raf = 0
    const start = performance.now()
    const total = duration * 1000

    const tick = (now: number) => {
      const progress = Math.min((now - start) / total, 1)
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(from + (to - from) * eased)
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(raf)
  }, [inView, from, to, duration])

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: !!separator,
  }).replace(/,/g, separator)

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
