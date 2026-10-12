import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { AppError } from '../middleware/errorHandler'
import {
  listPlayersQuerySchema,
  toPlayer,
  type Player,
  type PlayerStats,
} from '../types/players.types'

export const playersRouter: Router = Router()

const SORT_COLUMN: Record<string, string> = {
  score: 'score',
  rating: 'rating',
  orders: 'orders',
  price: 'price_per_hour',
}

/**
 * GET /api/players — 排行榜（置顶优先，随后按指定维度排序）
 * Query: game, keyword, sort, order, status
 */
playersRouter.get('/', async (req: Request, res: Response) => {
  const query = listPlayersQuerySchema.parse(req.query)

  const conditions: string[] = []
  const params: unknown[] = []

  if (query.status === 'active') {
    conditions.push(`status = 'active'`)
  }
  if (query.game) {
    params.push(query.game)
    conditions.push(`game = $${params.length}`)
  }
  if (query.keyword) {
    params.push(`%${query.keyword}%`)
    conditions.push(`(nickname ILIKE $${params.length} OR description ILIKE $${params.length} OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE $${params.length}))`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const column = SORT_COLUMN[query.sort] ?? 'score'
  const direction = query.order === 'asc' ? 'ASC' : 'DESC'

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM players ${where} ORDER BY is_pinned DESC, ${column} ${direction}, id ASC`,
    params
  )

  const players: Player[] = rows.map(toPlayer)
  res.json({ status: 'ok', data: players, total: players.length })
})

/**
 * GET /api/players/:id — 陪玩详情（仅上架可见）
 */
playersRouter.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM players WHERE id = $1 AND status = 'active'`,
    [id]
  )
  if (rows.length === 0) {
    throw new AppError(404, '陪玩不存在或已下架')
  }
  res.json({ status: 'ok', data: toPlayer(rows[0]) })
})

/**
 * GET /api/stats — 公开统计
 */
const statsRouter: Router = Router()
statsRouter.get('/', async (_req: Request, res: Response) => {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT
       COUNT(*)::int AS total_players,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active_players,
       COUNT(*) FILTER (WHERE status = 'active' AND is_online)::int AS online_players,
       COALESCE(SUM(orders), 0)::int AS total_orders,
       COALESCE(ROUND(AVG(rating), 1), 0)::float AS avg_rating
     FROM players`
  )
  const stats: PlayerStats = {
    totalPlayers: rows[0].total_players as number,
    activePlayers: rows[0].active_players as number,
    onlinePlayers: rows[0].online_players as number,
    totalOrders: rows[0].total_orders as number,
    avgRating: Number(rows[0].avg_rating),
  }
  res.json({ status: 'ok', data: stats })
})

export { statsRouter }
