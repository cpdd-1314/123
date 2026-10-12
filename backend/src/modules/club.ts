import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { pool } from '../db'
import { AppError } from '../middleware/errorHandler'
import { validate } from '../middleware/validation'
import { requireAdmin } from '../middleware/auth'
import { broadcast } from './events'
import { fingerprint, getRatingSummary, hasRated, insertRating, listRatings } from './ratings'
import { createRatingSchema, updateClubSchema, type Club, type RatingItem } from '../types/players.types'

export const clubRouter: Router = Router()

interface ClubRow {
  id: number
  name: string
  slogan: string
  description: string
  avatar: string
  updated_at: Date
}

async function loadClub(): Promise<Club> {
  const { rows } = await pool.query<ClubRow>('SELECT * FROM club WHERE id = 1')
  if (rows.length === 0) {
    throw new AppError(500, '俱乐部信息缺失')
  }
  const row = rows[0]

  const [rating, member] = await Promise.all([
    getRatingSummary('club', 0),
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM players WHERE status = 'active'`
    ),
  ])

  return {
    id: row.id,
    name: row.name,
    slogan: row.slogan,
    description: row.description,
    avatar: row.avatar,
    rating,
    memberCount: member.rows[0]?.count ?? 0,
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * GET /api/club — 俱乐部信息 + 星级评分汇总
 * 响应含 rated：当前访客是否已评价过
 */
clubRouter.get('/', async (req: Request, res: Response) => {
  const club = await loadClub()
  const rated = await hasRated('club', 0, fingerprint(req))
  res.json({ status: 'ok', data: { ...club, rated } })
})

/**
 * GET /api/club/ratings — 俱乐部评价列表
 */
clubRouter.get('/ratings', async (_req: Request, res: Response) => {
  const [summary, items] = await Promise.all([
    getRatingSummary('club', 0),
    listRatings('club', 0, 30),
  ])
  res.json({ status: 'ok', data: { summary, items } })
})

/**
 * POST /api/club/ratings — 提交俱乐部星级评价（每个访客一次）
 */
clubRouter.post('/ratings', validate(createRatingSchema), async (req: Request, res: Response) => {
  const input = req.body as z.infer<typeof createRatingSchema>
  const fp = fingerprint(req)

  const ok = await insertRating('club', 0, input.stars, input.comment, fp)
  if (!ok) {
    throw new AppError(409, '您已经评价过俱乐部啦，感谢支持！')
  }

  broadcast({ type: 'stats-changed', payload: { action: 'club-rated' } })
  const summary = await getRatingSummary('club', 0)
  res.status(201).json({ status: 'ok', data: summary })
})

/**
 * PUT /api/admin/club — 修改俱乐部信息（管理员）
 */
clubRouter.put(
  '/admin/club',
  requireAdmin,
  validate(updateClubSchema),
  async (req: Request, res: Response) => {
    const input = req.body as z.infer<typeof updateClubSchema>
    await pool.query(
      `UPDATE club SET name = $1, slogan = $2, description = $3, avatar = $4, updated_at = NOW()
       WHERE id = 1`,
      [input.name, input.slogan, input.description, input.avatar]
    )
    broadcast({ type: 'stats-changed', payload: { action: 'club-updated' } })
    const club = await loadClub()
    res.json({ status: 'ok', data: club })
  }
)

export type { RatingItem }
