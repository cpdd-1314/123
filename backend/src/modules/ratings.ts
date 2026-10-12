import { createHash } from 'node:crypto'
import type { Request } from 'express'
import { pool } from '../db'
import type { RatingItem, RatingSummary } from '../types/players.types'

export type RatingTarget = 'player' | 'club'

/**
 * 生成访客指纹（IP + UA 哈希），用于「每人只能评价一次」去重
 */
export function fingerprint(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  const ua = req.headers['user-agent'] ?? 'unknown'
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex')
}

export async function getRatingSummary(
  targetType: RatingTarget,
  targetId = 0
): Promise<RatingSummary> {
  const { rows } = await pool.query<{ stars: number; count: number }>(
    `SELECT stars, COUNT(*)::int AS count
     FROM ratings WHERE target_type = $1 AND target_id = $2
     GROUP BY stars`,
    [targetType, targetId]
  )

  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  let total = 0
  let weighted = 0
  for (const row of rows) {
    const stars = Number(row.stars)
    const count = Number(row.count)
    distribution[String(stars)] = count
    total += count
    weighted += stars * count
  }

  return {
    average: total > 0 ? Number((weighted / total).toFixed(1)) : 0,
    count: total,
    distribution,
  }
}

export async function hasRated(
  targetType: RatingTarget,
  targetId: number,
  fp: string
): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM ratings WHERE target_type = $1 AND target_id = $2 AND fingerprint = $3',
    [targetType, targetId, fp]
  )
  return rows.length > 0
}

export async function listRatings(
  targetType: RatingTarget,
  targetId = 0,
  limit = 20
): Promise<RatingItem[]> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT id, stars, comment, created_at
     FROM ratings WHERE target_type = $1 AND target_id = $2
     ORDER BY created_at DESC LIMIT $3`,
    [targetType, targetId, limit]
  )
  return rows.map((row) => ({
    id: row.id as number,
    stars: Number(row.stars),
    comment: (row.comment as string) ?? '',
    createdAt: (row.created_at as Date).toISOString(),
  }))
}

/**
 * 写入评价；同一指纹重复评价返回 false
 */
export async function insertRating(
  targetType: RatingTarget,
  targetId: number,
  stars: number,
  comment: string,
  fp: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO ratings (target_type, target_id, stars, comment, fingerprint)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (target_type, target_id, fingerprint) DO NOTHING`,
    [targetType, targetId, stars, comment, fp]
  )
  return (rowCount ?? 0) > 0
}
