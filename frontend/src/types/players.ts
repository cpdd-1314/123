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
  isOnline: boolean
  status: 'active' | 'offline'
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface PlayerStats {
  totalPlayers: number
  activePlayers: number
  onlinePlayers: number
  totalOrders: number
  avgRating: number
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
  orders: '接单数',
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
  isOnline: boolean
  status: 'active' | 'offline'
  isPinned: boolean
}
