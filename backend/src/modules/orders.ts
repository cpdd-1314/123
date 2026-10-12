import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { pool } from '../db'
import { AppError } from '../middleware/errorHandler'
import { validate } from '../middleware/validation'
import { requireAdmin } from '../middleware/auth'
import { requirePlayer } from '../middleware/player-auth'
import { broadcast } from './events'

export const ordersRouter: Router = Router()

export interface Order {
  id: number
  title: string
  game: string
  description: string
  price: number
  duration: number
  customerNote: string
  status: 'open' | 'taken' | 'done' | 'canceled'
  assignedPlayerId: number | null
  assignedPlayerName: string | null
  takenById: number | null
  takenByName: string | null
  takenAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

const ORDER_SELECT = `
  SELECT o.*,
         ap.nickname AS assigned_player_name
  FROM orders o
  LEFT JOIN players ap ON ap.id = o.assigned_player_id
`

function toOrder(row: Record<string, unknown>): Order {
  const iso = (v: unknown) => (v ? (v as Date).toISOString() : null)
  return {
    id: row.id as number,
    title: row.title as string,
    game: row.game as string,
    description: row.description as string,
    price: Number(row.price),
    duration: Number(row.duration),
    customerNote: (row.customer_note as string) ?? '',
    status: row.status as Order['status'],
    assignedPlayerId: (row.assigned_player_id as number | null) ?? null,
    assignedPlayerName: (row.assigned_player_name as string | null) ?? null,
    takenById: (row.taken_by_id as number | null) ?? null,
    takenByName: (row.taken_by_name as string | null) ?? null,
    takenAt: iso(row.taken_at),
    completedAt: iso(row.completed_at),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

// ---- Schema ----

const createOrderSchema = z.object({
  title: z.string().min(1, '订单标题不能为空').max(80),
  game: z.string().min(1, '请选择游戏').max(50),
  description: z.string().max(1000).default(''),
  price: z.number().int().min(0).default(0),
  duration: z.number().int().min(1).max(24).default(1),
  customerNote: z.string().max(200).default(''),
  assignedPlayerId: z.number().int().positive().nullable().optional(),
})

const updateOrderSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  game: z.string().min(1).max(50).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().int().min(0).optional(),
  duration: z.number().int().min(1).max(24).optional(),
  customerNote: z.string().max(200).optional(),
  status: z.enum(['open', 'taken', 'done', 'canceled']).optional(),
  assignedPlayerId: z.number().int().positive().nullable().optional(),
})

// ==================== 管理端 ====================

/** GET /api/admin/orders — 订单列表（可按状态筛选） */
ordersRouter.get('/admin/orders', requireAdmin, async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const conditions: string[] = []
  const params: unknown[] = []

  if (status && status !== 'all') {
    params.push(status)
    conditions.push(`o.status = $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await pool.query<Record<string, unknown>>(
    `${ORDER_SELECT} ${where} ORDER BY
       CASE o.status WHEN 'open' THEN 0 WHEN 'taken' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
       o.created_at DESC`,
    params
  )

  res.json({ status: 'ok', data: rows.map(toOrder) })
})

/** POST /api/admin/orders — 新建订单 */
ordersRouter.post('/admin/orders', requireAdmin, validate(createOrderSchema), async (req: Request, res: Response) => {
  const input = req.body as z.infer<typeof createOrderSchema>

  // 校验指定陪玩存在
  if (input.assignedPlayerId) {
    const exists = await pool.query('SELECT 1 FROM players WHERE id = $1', [input.assignedPlayerId])
    if (exists.rows.length === 0) {
      throw new AppError(400, '指定的陪玩不存在')
    }
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO orders
       (title, game, description, price, duration, customer_note, assigned_player_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      input.title,
      input.game,
      input.description,
      input.price,
      input.duration,
      input.customerNote,
      input.assignedPlayerId ?? null,
    ]
  )

  const created = await pool.query<Record<string, unknown>>(`${ORDER_SELECT} WHERE o.id = $1`, [rows[0].id])
  broadcast({ type: 'orders-changed', payload: { action: 'created', id: rows[0].id } })
  res.status(201).json({ status: 'ok', data: toOrder(created.rows[0]) })
})

/** PUT /api/admin/orders/:id — 编辑订单 / 指派陪玩 / 改状态 */
ordersRouter.put('/admin/orders/:id', requireAdmin, validate(updateOrderSchema), async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const input = req.body as z.infer<typeof updateOrderSchema>
  const columnMap: Record<string, string> = {
    title: 'title',
    game: 'game',
    description: 'description',
    price: 'price',
    duration: 'duration',
    customerNote: 'customer_note',
    status: 'status',
    assignedPlayerId: 'assigned_player_id',
  }

  if (input.assignedPlayerId) {
    const exists = await pool.query('SELECT 1 FROM players WHERE id = $1', [input.assignedPlayerId])
    if (exists.rows.length === 0) {
      throw new AppError(400, '指定的陪玩不存在')
    }
  }

  const sets: string[] = []
  const params: unknown[] = []
  for (const [key, column] of Object.entries(columnMap)) {
    if (input[key as keyof typeof input] !== undefined) {
      params.push(input[key as keyof typeof input] ?? null)
      sets.push(`${column} = $${params.length}`)
    }
  }

  if (sets.length === 0) {
    throw new AppError(400, '没有需要更新的字段')
  }

  // 重新指派陪玩时，清空原有接单人，让订单回到待接状态
  if (input.assignedPlayerId !== undefined && input.status === undefined) {
    sets.push(`taken_by_id = NULL`, `taken_by_name = NULL`, `taken_at = NULL`, `status = 'open'`)
  }

  params.push(id)
  const { rowCount } = await pool.query(
    `UPDATE orders SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
    params
  )

  if (rowCount === 0) {
    throw new AppError(404, '订单不存在')
  }

  const updated = await pool.query<Record<string, unknown>>(`${ORDER_SELECT} WHERE o.id = $1`, [id])
  broadcast({ type: 'orders-changed', payload: { action: 'updated', id } })
  res.json({ status: 'ok', data: toOrder(updated.rows[0]) })
})

/** DELETE /api/admin/orders/:id — 删除订单 */
ordersRouter.delete('/admin/orders/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [id])
  if (rowCount === 0) {
    throw new AppError(404, '订单不存在')
  }
  broadcast({ type: 'orders-changed', payload: { action: 'deleted', id } })
  res.json({ status: 'ok' })
})

// ==================== 陪玩端 ====================

/** GET /api/player/orders — 陪玩可见的订单（指派给我的 + 未指派的公开订单 + 我接的单） */
ordersRouter.get('/player/orders', requirePlayer, async (req: Request, res: Response) => {
  const playerId = req.player!.sub

  const { rows } = await pool.query<Record<string, unknown>>(
    `${ORDER_SELECT}
     WHERE o.status IN ('open', 'taken', 'done')
       AND (
         o.assigned_player_id = $1              -- 指定给我
         OR o.assigned_player_id IS NULL        -- 公开订单
         OR o.taken_by_id = $1                  -- 我接的单
       )
     ORDER BY
       CASE o.status WHEN 'open' THEN 0 WHEN 'taken' THEN 1 ELSE 2 END,
       o.assigned_player_id = $1 DESC,
       o.created_at DESC
     LIMIT 100`,
    [playerId]
  )

  res.json({ status: 'ok', data: rows.map(toOrder) })
})

/** POST /api/player/orders/:id/take — 接单 */
ordersRouter.post('/player/orders/:id/take', requirePlayer, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const playerId = req.player!.sub

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  // 取陪玩昵称
  const player = await pool.query<{ nickname: string }>('SELECT nickname FROM players WHERE id = $1', [playerId])
  if (player.rows.length === 0) {
    throw new AppError(404, '陪玩账号不存在')
  }
  const nickname = player.rows[0].nickname

  /**
   * 原子接单：仅当订单仍为 open 且未被指派给他人时更新成功。
   * 条件全部写进 SQL，避免并发下的「抢单」竞态。
   */
  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE orders
        SET status = 'taken',
            taken_by_id = $1,
            taken_by_name = $2,
            taken_at = NOW(),
            updated_at = NOW()
      WHERE id = $3
        AND status = 'open'
        AND (assigned_player_id IS NULL OR assigned_player_id = $1)
      RETURNING id`,
    [playerId, nickname, id]
  )

  if (rows.length === 0) {
    // 区分「不存在」「已被接走/已结束」「无权接单」三种情况
    const cur = await pool.query<Record<string, unknown>>(
      'SELECT status, assigned_player_id FROM orders WHERE id = $1',
      [id]
    )
    if (cur.rows.length === 0) {
      throw new AppError(404, '订单不存在')
    }
    const row = cur.rows[0]
    if (row.status !== 'open') {
      throw new AppError(409, '该订单已被接走或已结束')
    }
    if (row.assigned_player_id && Number(row.assigned_player_id) !== playerId) {
      throw new AppError(403, '该订单已指定其他陪玩接单')
    }
    throw new AppError(409, '该订单已被接走或已结束')
  }

  broadcast({ type: 'orders-changed', payload: { action: 'taken', id, playerId } })
  const taken = await pool.query<Record<string, unknown>>(`${ORDER_SELECT} WHERE o.id = $1`, [id])
  res.json({ status: 'ok', data: toOrder(taken.rows[0]) })
})

/** POST /api/player/orders/:id/complete — 陪玩标记订单完成 */
ordersRouter.post('/player/orders/:id/complete', requirePlayer, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const playerId = req.player!.sub

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的ID')
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE orders
        SET status = 'done', completed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND taken_by_id = $2 AND status = 'taken'
      RETURNING id`,
    [id, playerId]
  )

  if (rows.length === 0) {
    throw new AppError(409, '只有自己接下的进行中订单才能标记完成')
  }

  // 订单完成后，为该陪玩累加人气（每单 +100）
  await pool.query(
    `UPDATE players SET orders = orders + 1, score = (orders + 1) * 100, updated_at = NOW() WHERE id = $1`,
    [playerId]
  )

  broadcast({ type: 'orders-changed', payload: { action: 'completed', id, playerId } })
  broadcast({ type: 'players-changed', payload: { action: 'updated', id: playerId } })

  const done = await pool.query<Record<string, unknown>>(`${ORDER_SELECT} WHERE o.id = $1`, [id])
  res.json({ status: 'ok', data: toOrder(done.rows[0]) })
})

/** GET /api/orders — 公开订单大厅（仅展示待接单，不含客户备注） */
export const publicOrdersRouter: Router = Router()
publicOrdersRouter.get('/', async (_req: Request, res: Response) => {
  // 复用统一查询，保证字段齐全（toOrder 依赖完整行）
  const { rows } = await pool.query<Record<string, unknown>>(
    `${ORDER_SELECT}
      WHERE o.status IN ('open', 'taken')
      ORDER BY CASE o.status WHEN 'open' THEN 0 ELSE 1 END, o.created_at DESC
      LIMIT 50`
  )
  // 公开大厅不暴露客户备注等隐私字段
  res.json({
    status: 'ok',
    data: rows.map((row) => {
      const order = toOrder(row)
      return { ...order, customerNote: '' }
    }),
  })
})
