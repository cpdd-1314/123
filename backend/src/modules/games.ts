import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { pool } from '../db'
import { AppError } from '../middleware/errorHandler'
import { validate } from '../middleware/validation'
import { requireAdmin } from '../middleware/auth'
import { broadcast } from './events'

export interface Game {
  id: number
  name: string
  sortOrder: number
}

export const gamesRouter: Router = Router()

const createGameSchema = z.object({
  name: z.string().trim().min(1, '游戏名称不能为空').max(50, '名称最多 50 字'),
})

/** GET /api/games — 公开：游戏目录（按排序、创建顺序返回） */
gamesRouter.get('/', async (_req: Request, res: Response) => {
  const { rows } = await pool.query<Game>(
    `SELECT id, name, sort_order AS "sortOrder" FROM games ORDER BY sort_order ASC, id ASC`
  )
  res.json({ status: 'ok', data: rows })
})

/** POST /api/games — 管理员：新增游戏（去重） */
gamesRouter.post(
  '/',
  requireAdmin,
  validate(createGameSchema),
  async (req: Request, res: Response) => {
    const { name } = req.body as z.infer<typeof createGameSchema>

    const dup = await pool.query('SELECT 1 FROM games WHERE name = $1', [name])
    if (dup.rows.length > 0) {
      throw new AppError(409, '该游戏已存在')
    }

    const { rows } = await pool.query<Game>(
      `INSERT INTO games (name, sort_order)
       VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM games))
       RETURNING id, name, sort_order AS "sortOrder"`,
      [name]
    )

    broadcast({ type: 'games-changed', payload: { action: 'created' } })
    res.status(201).json({ status: 'ok', data: rows[0] })
  }
)

/** DELETE /api/games/:id — 管理员：删除游戏 */
gamesRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const { rowCount } = await pool.query('DELETE FROM games WHERE id = $1', [id])
  if (rowCount === 0) {
    throw new AppError(404, '游戏不存在')
  }

  broadcast({ type: 'games-changed', payload: { action: 'deleted' } })
  res.json({ status: 'ok' })
})
