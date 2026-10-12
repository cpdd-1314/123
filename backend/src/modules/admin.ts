import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { pool } from '../db'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { validate } from '../middleware/validation'
import {
  clearAuthCookie,
  requireAdmin,
  setAuthCookie,
  signAdminToken,
} from '../middleware/auth'
import { broadcast } from './events'
import {
  createPlayerSchema,
  loginSchema,
  toPlayer,
  updatePlayerSchema,
  type Player,
} from '../types/players.types'

export const adminRouter: Router = Router()

// 密码哈希缓存（进程启动时生成一次）
const passwordHash = bcrypt.hashSync(env.ADMIN_PASSWORD, 10)

/**
 * POST /api/admin/login — 管理员登录（httpOnly Cookie JWT）
 */
adminRouter.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body as z.infer<typeof loginSchema>

  const userOk = username === env.ADMIN_USERNAME
  const passOk = userOk && bcrypt.compareSync(password, passwordHash)
  if (!passOk) {
    throw new AppError(401, '账号或密码错误')
  }

  setAuthCookie(res, signAdminToken(username))
  res.json({ status: 'ok', data: { username } })
})

/**
 * POST /api/admin/logout — 退出登录
 */
adminRouter.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res)
  res.json({ status: 'ok' })
})

/**
 * GET /api/admin/me — 当前登录信息
 */
adminRouter.get('/me', requireAdmin, (req: Request, res: Response) => {
  res.json({ status: 'ok', data: { username: req.admin?.username } })
})

// ---- 以下接口均需登录 ----

/**
 * GET /api/admin/players — 管理端列表（含已下架）
 */
adminRouter.get('/players', requireAdmin, async (_req: Request, res: Response) => {
  const { rows } = await pool.query<Record<string, unknown>>(
    'SELECT * FROM players ORDER BY is_pinned DESC, score DESC, id ASC'
  )
  const players: Player[] = rows.map(toPlayer)
  res.json({ status: 'ok', data: players, total: players.length })
})

/**
 * POST /api/admin/players — 新增陪玩
 */
adminRouter.post('/players', requireAdmin, validate(createPlayerSchema), async (req: Request, res: Response) => {
  const input = req.body as z.infer<typeof createPlayerSchema>

  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO players
       (nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, is_online, status, is_pinned)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.nickname,
      input.avatar,
      input.game,
      input.tags,
      input.description,
      input.pricePerHour,
      input.rating,
      input.orders,
      input.score,
      input.isOnline,
      input.status,
      input.isPinned,
    ]
  )

  broadcast({ type: 'players-changed', payload: { action: 'created', id: rows[0].id } })
  res.status(201).json({ status: 'ok', data: toPlayer(rows[0]) })
})

/**
 * PUT /api/admin/players/:id — 编辑陪玩
 */
adminRouter.put('/players/:id', requireAdmin, validate(updatePlayerSchema), async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const input = req.body as z.infer<typeof updatePlayerSchema>
  const columnMap: Record<string, string> = {
    nickname: 'nickname',
    avatar: 'avatar',
    game: 'game',
    tags: 'tags',
    description: 'description',
    pricePerHour: 'price_per_hour',
    rating: 'rating',
    orders: 'orders',
    score: 'score',
    isOnline: 'is_online',
    status: 'status',
    isPinned: 'is_pinned',
  }

  const sets: string[] = []
  const params: unknown[] = []
  for (const [key, column] of Object.entries(columnMap)) {
    if (input[key as keyof typeof input] !== undefined) {
      params.push(input[key as keyof typeof input])
      sets.push(`${column} = $${params.length}`)
    }
  }

  if (sets.length === 0) {
    throw new AppError(400, '没有需要更新的字段')
  }

  params.push(id)
  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE players SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  )

  if (rows.length === 0) {
    throw new AppError(404, '陪玩不存在')
  }
  broadcast({ type: 'players-changed', payload: { action: 'updated', id } })
  res.json({ status: 'ok', data: toPlayer(rows[0]) })
})

/**
 * DELETE /api/admin/players/:id — 删除陪玩
 */
adminRouter.delete('/players/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const { rowCount } = await pool.query('DELETE FROM players WHERE id = $1', [id])
  if (rowCount === 0) {
    throw new AppError(404, '陪玩不存在')
  }
  broadcast({ type: 'players-changed', payload: { action: 'deleted', id } })
  res.json({ status: 'ok' })
})

/**
 * PATCH /api/admin/players/:id/status — 上架 / 下架
 */
adminRouter.patch('/players/:id/status', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const status = req.body?.status
  if (status !== 'active' && status !== 'offline') {
    throw new AppError(400, 'status 必须为 active 或 offline')
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE players SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  )
  if (rows.length === 0) {
    throw new AppError(404, '陪玩不存在')
  }
  broadcast({ type: 'players-changed', payload: { action: 'status-changed', id } })
  res.json({ status: 'ok', data: toPlayer(rows[0]) })
})

/**
 * PATCH /api/admin/players/:id/pin — 置顶 / 取消置顶
 */
adminRouter.patch('/players/:id/pin', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE players SET is_pinned = NOT is_pinned, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  )
  if (rows.length === 0) {
    throw new AppError(404, '陪玩不存在')
  }
  broadcast({ type: 'players-changed', payload: { action: 'pin-toggled', id } })
  res.json({ status: 'ok', data: toPlayer(rows[0]) })
})
