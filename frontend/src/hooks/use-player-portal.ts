import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { PlayerPortalData } from '@/types/players'

/** 陪玩端登录态 */
export function usePlayerAuth() {
  return useQuery<PlayerPortalData>({
    queryKey: ['player-me'],
    queryFn: async () => {
      const { data } = await apiClient.get('/player/me')
      return data.data as PlayerPortalData
    },
    retry: false,
    staleTime: 30 * 1000,
  })
}

export function usePlayerLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      const { data } = await apiClient.post('/player/login', creds)
      return data.data as { id: number; username: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-me'] })
    },
  })
}

export function usePlayerLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/player/logout')
    },
    onSuccess: () => {
      queryClient.setQueryData(['player-me'], null)
      queryClient.clear()
    },
  })
}
