import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * 实时同步：订阅后端 SSE，收到数据变更事件后自动刷新相关查询
 * 后台任何增删改 → 前台榜单/统计/详情即时更新
 *
 * @returns connected — 当前 SSE 连接状态
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const retryRef = useRef(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const connect = () => {
      if (disposed) return
      es = new EventSource('/api/events')

      es.onopen = () => {
        retryRef.current = 0
        setConnected(true)
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'players-changed') {
            // 失效榜单、统计、详情缓存 → 自动重新拉取
            queryClient.invalidateQueries({ queryKey: ['players'] })
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            queryClient.invalidateQueries({ queryKey: ['player'] })
            queryClient.invalidateQueries({ queryKey: ['player-ratings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-players'] })
          }
          if (data.type === 'stats-changed') {
            // 俱乐部资料 / 俱乐部评价变更
            queryClient.invalidateQueries({ queryKey: ['club'] })
            queryClient.invalidateQueries({ queryKey: ['club-ratings'] })
            queryClient.invalidateQueries({ queryKey: ['stats'] })
          }
        } catch {
          // 忽略心跳/解析失败
        }
      }

      es.onerror = () => {
        setConnected(false)
        es?.close()
        // 指数退避重连（最多 ~30s）
        retryRef.current = Math.min(retryRef.current + 1, 5)
        const delay = Math.min(1000 * 2 ** retryRef.current, 30_000)
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      es?.close()
    }
  }, [queryClient])

  return { connected }
}
