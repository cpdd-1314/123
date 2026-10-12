import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type {
  AdminPlayer,
  Game,
  GeneratedAccount,
  Player,
  PlayerQuery,
  PlayerStats,
} from '@/types/players'

/** 排行榜列表 */
export function usePlayers(query: PlayerQuery) {
  return useQuery<Player[]>({
    queryKey: ['players', query],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (query.game) params.game = query.game
      if (query.keyword) params.keyword = query.keyword
      if (query.sort) params.sort = query.sort
      if (query.order) params.order = query.order
      const { data } = await apiClient.get('/players', { params })
      return data.data as Player[]
    },
    staleTime: 30 * 1000,
  })
}

/** 历史榜单（上周 / 上月最佳） */
export interface HistoryRankRow {
  rank: number
  playerId: number
  nickname: string
  avatar: string
  game: string
  score: number
  orders: number
  rating: number
}
export interface HistoryData {
  period: 'weekly' | 'monthly'
  periodStart: string
  list: HistoryRankRow[]
}

export function useHistoryPlayers(period: 'weekly' | 'monthly' | null) {
  return useQuery<HistoryData>({
    queryKey: ['players-history', period],
    queryFn: async () => {
      const { data } = await apiClient.get('/players/history', { params: { period } })
      return data.data as HistoryData
    },
    enabled: !!period,
    staleTime: 5 * 60 * 1000,
  })
}

/** 公开统计 */
export function useStats() {
  return useQuery<PlayerStats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/stats')
      return data.data as PlayerStats
    },
    staleTime: 30 * 1000,
  })
}

/** 游戏目录（公开） */
export function useGames() {
  return useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: async () => {
      const { data } = await apiClient.get('/games')
      return data.data as Game[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** 管理员：游戏增删 */
export function useGameMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['games'] })

  const createGame = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post('/games', { name })
      return data.data as Game
    },
    onSuccess: invalidate,
  })

  const deleteGame = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/games/${id}`)
    },
    onSuccess: invalidate,
  })

  return { createGame, deleteGame }
}

/** 陪玩详情 */
export function usePlayer(id: number | undefined) {
  return useQuery<Player>({
    queryKey: ['player', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/players/${id}`)
      return data.data as Player
    },
    enabled: !!id,
  })
}

// ---- 管理端 ----

export function useAdminPlayers(enabled = true) {
  return useQuery<AdminPlayer[]>({
    queryKey: ['admin-players'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/players')
      return data.data as AdminPlayer[]
    },
    enabled,
    staleTime: 10 * 1000,
  })
}

export function usePlayerMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-players'] })
    queryClient.invalidateQueries({ queryKey: ['players'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const createPlayer = useMutation({
    mutationFn: async (input: Partial<Player>) => {
      const { data } = await apiClient.post('/admin/players', input)
      return data.data as AdminPlayer
    },
    onSuccess: invalidate,
  })

  const updatePlayer = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<Player> }) => {
      const { data } = await apiClient.put(`/admin/players/${id}`, input)
      return data.data as AdminPlayer
    },
    onSuccess: invalidate,
  })

  const deletePlayer = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/players/${id}`)
    },
    onSuccess: invalidate,
  })

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'active' | 'offline' }) => {
      const { data } = await apiClient.patch(`/admin/players/${id}/status`, { status })
      return data.data as AdminPlayer
    },
    onSuccess: invalidate,
  })

  const togglePin = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.patch(`/admin/players/${id}/pin`)
      return data.data as AdminPlayer
    },
    onSuccess: invalidate,
  })

  return { createPlayer, updatePlayer, deletePlayer, toggleStatus, togglePin }
}

/** 头像上传（返回可访问 URL） */
export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post('/admin/media', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data as { id: number; url: string }
    },
  })
}

/** 陪玩账号管理 */
export function useAccountMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-players'] })

  const generateAccount = useMutation({
    mutationFn: async ({ id, username }: { id: number; username?: string }) => {
      const { data } = await apiClient.post(`/admin/players/${id}/account`, { ...(username ? { username } : {}) })
      return data.data as GeneratedAccount
    },
    onSuccess: invalidate,
  })

  const revokeAccount = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/players/${id}/account`)
    },
    onSuccess: invalidate,
  })

  return { generateAccount, revokeAccount }
}
