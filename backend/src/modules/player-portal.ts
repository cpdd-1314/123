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
