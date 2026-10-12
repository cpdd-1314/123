import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
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
  toAdminPlayer,
  updatePlayerSchema,
  type AdminPlayer,
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

const ADMIN_PLAYER_SELECT = `
  SELECT p.*,
         COALESCE(r.cnt, 0)::int   AS review_count,
         COALESCE(r.avg, 0)::float AS review_average
  FROM players p
  LEFT JOIN (
    SELECT target_id, COUNT(*)::int AS cnt, ROUND(AVG(stars)::numeric, 1) AS avg
    FROM ratings WHERE target_type = 'player' GROUP BY target_id
  ) r ON r.target_id = p.id
`

/**
 * GET /api/admin/players — 管理端列表（含已下架与账号信息）
 */
adminRouter.get('/players', requireAdmin, async (_req: Request, res: Response) => {
  const { rows } = await pool.query<Record<string, unknown>>(
    `${ADMIN_PLAYER_SELECT} ORDER BY p.is_pinned DESC, p."score" DESC, p.id ASC`
  )
  const players: AdminPlayer[] = rows.map(toAdminPlayer)
  res.json({ status: 'ok', data: players, total: players.length })
})

/**
 * POST /api/admin/players — 新增陪玩
 */
adminRouter.post('/players', requireAdmin, validate(createPlayerSchema), async (req: Request, res: Response) => {
  const input = req.body as z.infer<typeof createPlayerSchema>

  // 人气由管理员显式设定（或留 0），不再随订单数自动计算
  const score = input.score ?? 0

  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO players
       (nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, status, is_pinned)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
      score,
      input.status,
      input.isPinned,
    ]
  )

  broadcast({ type: 'players-changed', payload: { action: 'created', id: rows[0].id } })
  res.status(201).json({ status: 'ok', data: toAdminPlayer(rows[0]) })
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

  // 人气（score）仅在管理员显式传入时更新，不再随订单数自动计算
  params.push(id)
  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE players SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  )

  if (rows.length === 0) {
    throw new AppError(404, '陪玩不存在')
  }
  broadcast({ type: 'players-changed', payload: { action: 'updated', id } })
  res.json({ status: 'ok', data: toAdminPlayer(rows[0]) })
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
  res.json({ status: 'ok', data: toAdminPlayer(rows[0]) })
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
  res.json({ status: 'ok', data: toAdminPlayer(rows[0]) })
})

// ---- 陪玩账号管理 ----

const ACCOUNT_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function randomPassword(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ACCOUNT_ALPHABET[randomInt(ACCOUNT_ALPHABET.length)]
  }
  return out
}

const accountSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '账号至少 3 个字符')
    .max(30, '账号最多 30 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '账号仅支持字母、数字、下划线')
    .optional(),
})

/**
 * POST /api/admin/players/:id/account — 生成/重置陪玩账号（密码仅返回一次）
 */
adminRouter.post('/players/:id/account', requireAdmin, validate(accountSchema), async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const input = req.body as z.infer<typeof accountSchema>
  const username = input.username ?? `peiwan${id}`

  const dup = await pool.query('SELECT 1 FROM players WHERE account_username = $1 AND id <> $2', [
    username,
    id,
  ])
  if (dup.rows.length > 0) {
    throw new AppError(409, '该账号名已被其他陪玩使用')
  }

  const password = randomPassword()
  const hash = bcrypt.hashSync(password, 10)

  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE players SET account_username = $1, account_password_hash = $2, updated_at = NOW()
     WHERE id = $3 RETURNING id, nickname, account_username`,
    [username, hash, id]
  )
  if (rows.length === 0) {
    throw new AppError(404, '陪玩不存在')
  }

  broadcast({ type: 'players-changed', payload: { action: 'account-changed', id } })
  res.json({
    status: 'ok',
    data: {
      id: rows[0].id,
      nickname: rows[0].nickname,
      username,
      password,
    },
  })
})

/**
 * DELETE /api/admin/players/:id/account — 注销陪玩账号
 */
adminRouter.delete('/players/:id/account', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { rowCount } = await pool.query(
    `UPDATE players SET account_username = NULL, account_password_hash = NULL, updated_at = NOW()
     WHERE id = $1`,
    [id]
  )
  if (rowCount === 0) {
    throw new AppError(404, '陪玩不存在')
  }
  broadcast({ type: 'players-changed', payload: { action: 'account-changed', id } })
  res.json({ status: 'ok' })
})

/**
 * POST /api/admin/players/:id/cleanup-test — 临时：清理测试残留（删除评价 + 重置奖励/签到）
 */
adminRouter.post('/players/:id/cleanup-test', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  await pool.query('DELETE FROM ratings WHERE target_type = $1 AND target_id = $2', ['player', id])
  await pool.query(
    'UPDATE players SET pending_score = 0, last_checkin_date = NULL, updated_at = NOW() WHERE id = $1',
    [id]
  )
  broadcast({ type: 'players-changed', payload: { action: 'updated', id } })
  res.json({ status: 'ok' })
})
