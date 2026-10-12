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

/** 陪玩自助修改个人资料 */
export function useUpdateSelf() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      nickname?: string
      avatar?: string
      game?: string
      tags?: string[]
      description?: string
      pricePerHour?: number
    }) => {
      const { data } = await apiClient.patch('/player/me', input)
      return data.data as PlayerPortalData['player']
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-me'] })
    },
  })
}

/** 陪玩修改登录密码 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { oldPassword: string; newPassword: string }) => {
      const { data } = await apiClient.post('/player/change-password', input)
      return data.data as { message: string }
    },
  })
}

/** 陪玩每日签到（+10 人气，每天一次） */
export function useCheckin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/player/checkin')
      return data.data as { message: string; score: number; pendingScore: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-me'] })
    },
  })
}

/** 陪玩领取待领取人气（接单/好评奖励） */
export function useClaimRewards() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/player/claim')
      return data.data as { claimed: number; score: number; pendingScore: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-me'] })
    },
  })
}
