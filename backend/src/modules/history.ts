import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { createLogger } from '../config/logger'

const logger = createLogger('History')
const SNAPSHOT_SIZE = 50

export interface SnapshotRow {
  rank: number
  playerId: number | null
  nickname: string
  avatar: string
  game: string
  score: number
  orders: number
  rating: number
}

/** 本周周一（ISO 周，周一为一周起点） */
function startOfThisWeek(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const day = (d.getUTCDay() + 6) % 7 // 0=周一 ... 6=周日
  d.setUTCDate(d.getUTCDate() - day)
  return d
}

/** 本月 1 号 */
function startOfThisMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** 上一完整周期的起点 */
function previousPeriod(type: 'weekly' | 'monthly', now = new Date()): string {
  if (type === 'weekly') {
    const d = startOfThisWeek(now)
    d.setUTCDate(d.getUTCDate() - 7)
    return isoDate(d)
  }
  const d = startOfThisMonth(now)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return isoDate(d)
}

/**
 * 归档上一完整周期的榜单快照（幂等：已有快照则跳过）。
 * 服务启动时 + 每小时执行一次，跨过周期边界后自动生成新快照。
 */
export async function ensurePeriodSnapshots(now = new Date()): Promise<void> {
  const types: Array<'weekly' | 'monthly'> = ['weekly', 'monthly']
  for (const type of types) {
    const periodStart = previousPeriod(type, now)

    const exists = await pool.query('SELECT 1 FROM ranking_snapshots WHERE period_type = $1 AND period_start = $2 LIMIT 1', [
      type,
      periodStart,
    ])
    if (exists.rows.length > 0) continue

    // 用当前榜单数据归档（快照 = 周期结束时的累计热度）
    await pool.query(
      `INSERT INTO ranking_snapshots
         (period_type, period_start, player_id, nickname, avatar, game, rank, score, orders, rating)
       SELECT $1, $2, p.id, p.nickname, p.avatar, p.game,
              ROW_NUMBER() OVER (ORDER BY p.is_pinned DESC, p."score" DESC, p."orders" DESC, p.id ASC),
              p."score", p."orders", p.rating
         FROM players p
        WHERE p.status = 'active'
        ORDER BY 7
        LIMIT $3`,
      [type, periodStart, SNAPSHOT_SIZE]
    )
    logger.info({ type, periodStart }, '已归档排行榜快照')
  }
}

/** 启动归档 + 每小时检查周期切换 */
export function startSnapshotScheduler(): void {
  void ensurePeriodSnapshots().catch((e) => logger.error({ err: e.message }, '快照归档失败'))
  setInterval(() => {
    void ensurePeriodSnapshots().catch((e) => logger.error({ err: e.message }, '快照归档失败'))
  }, 60 * 60 * 1000).unref()
}

// ==================== 查询接口 ====================

export const historyRouter: Router = Router()

/** GET /api/players/history?period=weekly|monthly — 上一周 / 上一月最佳榜 */
historyRouter.get('/history', async (req: Request, res: Response) => {
  const period = req.query.period === 'monthly' ? 'monthly' : 'weekly'
  const periodStart = previousPeriod(period)

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT rank, player_id, nickname, avatar, game, score, orders, rating
       FROM ranking_snapshots
      WHERE period_type = $1 AND period_start = $2
      ORDER BY rank ASC
      LIMIT 50`,
    [period, periodStart]
  )

  const data: SnapshotRow[] = rows.map((r) => ({
    rank: Number(r.rank),
    playerId: (r.player_id as number | null) ?? null,
    nickname: r.nickname as string,
    avatar: (r.avatar as string) ?? '',
    game: (r.game as string) ?? '',
    score: Number(r.score),
    orders: Number(r.orders),
    rating: Number(r.rating),
  }))

  res.json({ status: 'ok', data: { period, periodStart, list: data } })
})
