import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { pool } from '../db'
import { AppError } from '../middleware/errorHandler'
import { validate } from '../middleware/validation'
import {
  clearPlayerCookie,
  requirePlayer,
  setPlayerCookie,
  signPlayerToken,
} from '../middleware/player-auth'
import { getRatingSummary, listRatings } from './ratings'
import { loginSchema, toPlayer } from '../types/players.types'
import { broadcast } from './events'

const updateSelfSchema = z.object({
  nickname: z.string().trim().min(1, '昵称不能为空').max(50).optional(),
  avatar: z.string().max(500).optional(),
  game: z.string().trim().min(1, '请选择游戏').max(50).optional(),
  tags: z.array(z.string().min(1).max(10)).max(6).optional(),
  description: z.string().max(500).optional(),
  pricePerHour: z.number().int().min(0).max(9999).optional(),
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(6, '新密码至少 6 位').max(64, '新密码最多 64 位'),
})

const selfColumnMap: Record<string, string> = {
  nickname: 'nickname',
  avatar: 'avatar',
  game: 'game',
  tags: 'tags',
  description: 'description',
  pricePerHour: 'price_per_hour',
}

export const playerPortalRouter: Router = Router()

/**
 * POST /api/player/login — 陪玩账号登录
 */
playerPortalRouter.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body as z.infer<typeof loginSchema>

  const { rows } = await pool.query<{
    id: number
    account_username: string | null
    account_password_hash: string | null
  }>(
    'SELECT id, account_username, account_password_hash FROM players WHERE account_username = $1',
    [username]
  )

  const row = rows[0]
  const ok =
    row && row.account_password_hash && bcrypt.compareSync(password, row.account_password_hash)
  if (!ok) {
    throw new AppError(401, '账号或密码错误')
  }

  setPlayerCookie(res, signPlayerToken(row.id, username))
  res.json({ status: 'ok', data: { id: row.id, username } })
})

/**
 * POST /api/player/logout — 退出登录
 */
playerPortalRouter.post('/logout', (_req: Request, res: Response) => {
  clearPlayerCookie(res)
  res.json({ status: 'ok' })
})

/**
 * GET /api/player/me — 陪玩查看自己的数据与收到的评价
 */
playerPortalRouter.get('/me', requirePlayer, async (req: Request, res: Response) => {
  const playerId = req.player!.sub

  const { rows } = await pool.query<Record<string, unknown>>(
    'SELECT * FROM players WHERE id = $1',
    [playerId]
  )
  if (rows.length === 0) {
    throw new AppError(404, '账号对应的陪玩已不存在')
  }

  const [summary, items] = await Promise.all([
    getRatingSummary('player', playerId),
    listRatings('player', playerId, 30),
  ])

  res.json({
    status: 'ok',
    data: {
      player: toPlayer(rows[0]),
      account: { username: req.player!.username },
      reviews: { summary, items },
    },
  })
})

/**
 * PATCH /api/player/me — 陪玩自助修改个人资料（昵称/头像/游戏/标签/简介/单价）
 */
playerPortalRouter.patch(
  '/me',
  requirePlayer,
  validate(updateSelfSchema),
  async (req: Request, res: Response) => {
    const playerId = req.player!.sub
    const input = req.body as z.infer<typeof updateSelfSchema>

    const sets: string[] = []
    const params: unknown[] = []
    for (const [key, column] of Object.entries(selfColumnMap)) {
      const value = input[key as keyof typeof input]
      if (value !== undefined) {
        params.push(value)
        sets.push(`${column} = $${params.length}`)
      }
    }

    if (sets.length === 0) {
      throw new AppError(400, '没有需要更新的内容')
    }

    params.push(playerId)
    const { rows } = await pool.query<Record<string, unknown>>(
      `UPDATE players SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    )
    if (rows.length === 0) {
      throw new AppError(404, '账号对应的陪玩已不存在')
    }

    broadcast({ type: 'players-changed', payload: { action: 'updated', id: playerId } })
    res.json({ status: 'ok', data: toPlayer(rows[0]) })
  }
)

/**
 * POST /api/player/change-password — 陪玩修改登录密码
 */
playerPortalRouter.post(
  '/change-password',
  requirePlayer,
  validate(changePasswordSchema),
  async (req: Request, res: Response) => {
    const playerId = req.player!.sub
    const { oldPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>

    const { rows } = await pool.query<{ account_password_hash: string | null }>(
      'SELECT account_password_hash FROM players WHERE id = $1',
      [playerId]
    )
    if (rows.length === 0) {
      throw new AppError(404, '账号对应的陪玩已不存在')
    }

    const hash = rows[0].account_password_hash
    if (!hash || !bcrypt.compareSync(oldPassword, hash)) {
      throw new AppError(400, '当前密码不正确')
    }

    const newHash = bcrypt.hashSync(newPassword, 10)
    await pool.query(
      'UPDATE players SET account_password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, playerId]
    )

    res.json({ status: 'ok', data: { message: '密码修改成功，请使用新密码重新登录' } })
  }
)
