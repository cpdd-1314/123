import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { Player, PlayerQuery, PlayerStats } from '@/types/players'

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
  return useQuery<Player[]>({
    queryKey: ['admin-players'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/players')
      return data.data as Player[]
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
      return data.data as Player
    },
    onSuccess: invalidate,
  })

  const updatePlayer = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<Player> }) => {
      const { data } = await apiClient.put(`/admin/players/${id}`, input)
      return data.data as Player
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
      return data.data as Player
    },
    onSuccess: invalidate,
  })

  const togglePin = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.patch(`/admin/players/${id}/pin`)
      return data.data as Player
    },
    onSuccess: invalidate,
  })

  return { createPlayer, updatePlayer, deletePlayer, toggleStatus, togglePin }
}
