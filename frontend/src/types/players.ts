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
  totalOrders: number
  avgRating: number
  totalReviews: number
  avgReviewStars: number
}

export interface Club {
  id: number
  name: string
  slogan: string
  description: string
  avatar: string
  rating: RatingSummary
  memberCount: number
  updatedAt: string
  rated?: boolean
}

export interface PlayerQuery {
  game?: string
  keyword?: string
  sort?: 'score' | 'rating' | 'orders' | 'price'
  order?: 'asc' | 'desc'
}

export const GAME_OPTIONS = ['王者荣耀', '英雄联盟', '和平精英', '无畏契约', '永劫无间'] as const

export const SORT_LABELS: Record<string, string> = {
  score: '热度',
  rating: '评分',
  orders: '人气',
  price: '单价',
}

export interface PlayerInput {
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
}

export interface GeneratedAccount {
  id: number
  nickname: string
  username: string
  password: string
}

export interface PlayerPortalData {
  player: Player
  account: { username: string }
  reviews: { summary: RatingSummary; items: RatingItem[] }
}
