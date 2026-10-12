import { z } from 'zod'

export const GAME_OPTIONS = [
  '王者荣耀',
  '英雄联盟',
  '和平精英',
  '无畏契约',
  '永劫无间',
] as const

export const SORT_OPTIONS = ['score', 'rating', 'orders', 'price'] as const

// ---- 领域实体 ----
export interface Player {
  id: number
  nickname: string
  avatar: string
  game: string
  tags: string[]
  description: string
  pricePerHour: number
  rating: number
  orders: number
  score: number
  status: 'active' | 'offline'
  isPinned: boolean
  /** 用户星级评价聚合 */
  reviewCount: number
  reviewAverage: number
  createdAt: string
  updatedAt: string
}

/** 管理端额外可见的账号信息 */
export interface AdminPlayer extends Player {
  accountUsername: string | null
  hasAccount: boolean
}

export interface PlayerStats {
  totalPlayers: number
  activePlayers: number
  /** 总人气 */
  totalOrders: number
  /** 后台设定的平均评分 */
  avgRating: number
  /** 用户星级评价总数 */
  totalReviews: number
  /** 用户星级平均分 */
  avgReviewStars: number
}

export interface RatingSummary {
  average: number
  count: number
  distribution: Record<string, number>
}

export interface RatingItem {
  id: number
  stars: number
  comment: string
  createdAt: string
}

export interface Club {
  id: number
  name: string
  slogan: string
  description: string
  avatar: string
  rating: RatingSummary
  /** 俱乐部已上架陪玩数 */
  memberCount: number
  updatedAt: string
}

// ---- 查询 schema ----
export const listPlayersQuerySchema = z.object({
  game: z.string().optional(),
  keyword: z.string().optional(),
  sort: z.enum(SORT_OPTIONS).default('score'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'all']).default('active'),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ListPlayersQuery = z.infer<typeof listPlayersQuerySchema>

// ---- 管理端 schema ----
export const createPlayerSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空').max(50),
  avatar: z.string().default(''),
  game: z.string().min(1, '请选择游戏'),
  tags: z.array(z.string().min(1).max(10)).max(6).default([]),
  description: z.string().max(500).default(''),
  pricePerHour: z.number().int().min(0).max(9999).default(30),
  rating: z.number().min(0).max(5).default(5),
  orders: z.number().int().min(0).default(0),
  score: z.number().int().default(0),
  status: z.enum(['active', 'offline']).default('active'),
  isPinned: z.boolean().default(false),
})

export const updatePlayerSchema = createPlayerSchema.partial()

export const loginSchema = z.object({
  username: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
})

// ---- 星级评价 schema ----
export const createRatingSchema = z.object({
  stars: z.number().int().min(1, '请选择 1-5 星').max(5, '最多 5 星'),
  comment: z.string().max(200).default(''),
})

// ---- 俱乐部 schema ----
export const updateClubSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(80),
  slogan: z.string().max(200).default(''),
  description: z.string().max(1000).default(''),
  avatar: z.string().default(''),
})

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
export type CreateRatingInput = z.infer<typeof createRatingSchema>
export type UpdateClubInput = z.infer<typeof updateClubSchema>

// ---- DB 行 → 领域实体 ----
export function toPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as number,
    nickname: row.nickname as string,
    avatar: row.avatar as string,
    game: row.game as string,
    tags: (row.tags as string[]) ?? [],
    description: row.description as string,
    pricePerHour: Number(row.price_per_hour),
    rating: Number(row.rating),
    orders: Number(row.orders),
    score: Number(row.score),
    status: row.status as 'active' | 'offline',
    isPinned: row.is_pinned as boolean,
    reviewCount: Number(row.review_count ?? 0),
    reviewAverage: Number(row.review_average ?? 0),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

export function toAdminPlayer(row: Record<string, unknown>): AdminPlayer {
  const base = toPlayer(row)
  const accountUsername = (row.account_username as string | null) ?? null
  return {
    ...base,
    accountUsername,
    hasAccount: Boolean(accountUsername && row.account_password_hash),
  }
}
