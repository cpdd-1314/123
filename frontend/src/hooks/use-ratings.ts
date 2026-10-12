import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { RatingItem, RatingSummary } from '@/types/players'

export interface PlayerRatingData {
  summary: RatingSummary
  items: RatingItem[]
  rated: boolean
}

/** 某位陪玩的评价（汇总 + 列表 + 当前访客是否已评） */
export function usePlayerRatings(playerId: number | undefined) {
  return useQuery<PlayerRatingData>({
    queryKey: ['player-ratings', playerId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/players/${playerId}/ratings`)
      return data.data as PlayerRatingData
    },
    enabled: !!playerId,
    staleTime: 20 * 1000,
  })
}

/** 提交陪玩星级评价 */
export function useSubmitPlayerRating() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ playerId, stars, comment }: { playerId: number; stars: number; comment: string }) => {
      const { data } = await apiClient.post(`/players/${playerId}/ratings`, { stars, comment })
      return data.data as RatingSummary
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['player-ratings', vars.playerId] })
      queryClient.invalidateQueries({ queryKey: ['player', vars.playerId] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
