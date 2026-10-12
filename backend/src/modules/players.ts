import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { pool } from '../db'
import { AppError } from '../middleware/errorHandler'
import { validate } from '../middleware/validation'
import { fingerprint, getRatingSummary, hasRated, insertRating, listRatings } from './ratings'
import { broadcast } from './events'
import {
  createRatingSchema,
  listPlayersQuerySchema,
  toPlayer,
  type Player,
  type PlayerStats,
} from '../types/players.types'

export const playersRouter: Router = Router()

/**
 * 排序字段映射。
 * - score / orders / price 直接使用 players 表字段
 * - rating：优先使用用户真实评价均分（review_average），
 *   无人评价时回落到玩家资料里的初始评分，避免新陪玩因 0 评价沉底
 */
/**
 * 排序字段映射。
 * - score / orders / price 直接使用 players 表字段
 * - rating：优先使用用户真实评价均分（review_average），
 *   无人评价时回落到玩家资料里的初始评分，避免新陪玩因 0 评价沉底
 *
 * ⚠️ 注意：orders 同时是本库的一张真实表名，PostgreSQL 会把 `p.orders`
 * 解析为表引用而非列，必须加双引号强制按列处理，否则排序结果完全错乱。
 */
const SORT_EXPRESSION: Record<string, string> = {
  score: 'p."score"',
  orders: 'p."orders"',
  price: 'p."price_per_hour"',
  rating: `CASE WHEN COALESCE(r.cnt, 0) > 0 THEN COALESCE(r.avg, 0) ELSE p."rating" END`,
}

/** 带用户评价聚合的查询片段（review_count / review_average） */
const PLAYER_SELECT = `
  SELECT p.*,
         COALESCE(r.cnt, 0)::int           AS review_count,
         COALESCE(r.avg, 0)::float         AS review_average
  FROM players p
  LEFT JOIN (
    SELECT target_id, COUNT(*)::int AS cnt, ROUND(AVG(stars)::numeric, 1) AS avg
    FROM ratings WHERE target_type = 'player' GROUP BY target_id
  ) r ON r.target_id = p.id
`

/**
 * GET /api/players — 排行榜（置顶优先，随后按指定维度排序）
 * Query: game, keyword, sort, order, status
 */
playersRouter.get('/', async (req: Request, res: Response) => {
  const query = listPlayersQuerySchema.parse(req.query)

  const conditions: string[] = []
  const params: unknown[] = []

  if (query.status === 'active') {
    conditions.push(`p.status = 'active'`)
  }
  if (query.game) {
    params.push(query.game)
    conditions.push(`p.game = $${params.length}`)
  }
  if (query.keyword) {
    params.push(`%${query.keyword}%`)
    conditions.push(
      `(p.nickname ILIKE $${params.length} OR p.description ILIKE $${params.length} OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE $${params.length}))`
    )
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const expression = SORT_EXPRESSION[query.sort] ?? 'p."score"'
  const direction = query.order === 'asc' ? 'ASC' : 'DESC'

  // 分页（未传 limit 时返回全部，保持排行榜完整展示）
  let pagination = ''
  if (query.limit !== undefined) {
    params.push(query.limit)
    pagination += ` LIMIT $${params.length}`
    if (query.offset > 0) {
      params.push(query.offset)
      pagination += ` OFFSET $${params.length}`
    }
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `${PLAYER_SELECT} ${where} ORDER BY p.is_pinned DESC, ${expression} ${direction}, p.id ASC${pagination}`,
    params
  )

  const players: Player[] = rows.map(toPlayer)
  res.json({ status: 'ok', data: players, total: players.length })
})

/**
 * GET /api/players/:id/ratings — 某位陪玩的评价汇总与列表
 */
playersRouter.get('/:id/ratings', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const [summary, items, rated] = await Promise.all([
    getRatingSummary('player', id),
    listRatings('player', id, 30),
    hasRated('player', id, fingerprint(req)),
  ])

  res.json({ status: 'ok', data: { summary, items, rated } })
})

/**
 * POST /api/players/:id/ratings — 提交陪玩星级评价（每个访客一次）
 */
playersRouter.post('/:id/ratings', validate(createRatingSchema), async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const exists = await pool.query(`SELECT 1 FROM players WHERE id = $1 AND status = 'active'`, [id])
  if (exists.rows.length === 0) {
    throw new AppError(404, '陪玩不存在或已下架')
  }

  const input = req.body as z.infer<typeof createRatingSchema>
  const ok = await insertRating('player', id, input.stars, input.comment, fingerprint(req))
  if (!ok) {
    throw new AppError(409, '您已经评价过这位陪玩啦，感谢支持！')
  }

  const summary = await getRatingSummary('player', id)

  // 广播评价变更：排行榜评分与统计需要实时刷新
  broadcast({ type: 'players-changed', payload: { action: 'rated', id } })
  broadcast({ type: 'stats-changed', payload: { target: 'player', id } })

  res.status(201).json({ status: 'ok', data: summary })
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
    `${PLAYER_SELECT} WHERE p.id = $1 AND p.status = 'active'`,
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
  const [players, reviews] = await Promise.all([
    pool.query<Record<string, unknown>>(
      `SELECT
         COUNT(*)::int AS total_players,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_players,
         COALESCE(SUM(orders), 0)::int AS total_orders,
         COALESCE(ROUND(AVG(rating), 1), 0)::float AS avg_rating
       FROM players`
    ),
    pool.query<Record<string, unknown>>(
      `SELECT COUNT(*)::int AS total_reviews, COALESCE(ROUND(AVG(stars), 1), 0)::float AS avg_stars
       FROM ratings WHERE target_type = 'player'`
    ),
  ])

  const p = players.rows[0]
  const r = reviews.rows[0]
  const stats: PlayerStats = {
    totalPlayers: p.total_players as number,
    activePlayers: p.active_players as number,
    totalOrders: p.total_orders as number,
    avgRating: Number(p.avg_rating),
    totalReviews: r.total_reviews as number,
    avgReviewStars: Number(r.avg_stars),
  }
  res.json({ status: 'ok', data: stats })
})

export { statsRouter }
