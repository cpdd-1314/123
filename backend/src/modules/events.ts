import { Router, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { createLogger } from '../config/logger'

const logger = createLogger('Realtime')

export interface RealtimeEvent {
  type: 'players-changed' | 'stats-changed' | 'orders-changed' | 'games-changed'
  payload?: Record<string, unknown>
}

interface Client {
  id: string
  res: Response
}

const clients = new Set<Client>()
const HEARTBEAT_INTERVAL = 25_000

/**
 * 广播数据变更事件给所有 SSE 连接
 */
export function broadcast(event: RealtimeEvent): void {
  const frame = `data: ${JSON.stringify(event)}\n\n`
  for (const client of clients) {
    try {
      client.res.write(frame)
    } catch {
      clients.delete(client)
    }
  }
}

export const eventsRouter: Router = Router()

/**
 * GET /api/events — SSE 实时推送（前台订阅，数据变更即时刷新）
 */
eventsRouter.get('/', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用代理缓冲
  })

  const client: Client = { id: randomUUID(), res }
  clients.add(client)

  // 连接确认
  res.write(`data: ${JSON.stringify({ type: 'connected', payload: { clientId: client.id } })}\n\n`)

  // 心跳保活
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
      clients.delete(client)
    }
  }, HEARTBEAT_INTERVAL)

  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(client)
    logger.warn(`SSE client disconnected: ${client.id} (${clients.size} online)`)
  })

  logger.warn(`SSE client connected: ${client.id} (${clients.size} online)`)
})
