import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { Club, RatingItem, RatingSummary } from '@/types/players'

/** 俱乐部信息（含评分汇总与当前访客是否已评价） */
export function useClub() {
  return useQuery<Club>({
    queryKey: ['club'],
    queryFn: async () => {
      const { data } = await apiClient.get('/club')
      return data.data as Club
    },
    staleTime: 30 * 1000,
  })
}

/** 俱乐部评价列表 */
export function useClubRatings() {
  return useQuery<{ summary: RatingSummary; items: RatingItem[] }>({
    queryKey: ['club-ratings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/club/ratings')
      return data.data as { summary: RatingSummary; items: RatingItem[] }
    },
    staleTime: 30 * 1000,
  })
}

/** 提交俱乐部评价 */
export function useSubmitClubRating() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { stars: number; comment: string }) => {
      const { data } = await apiClient.post('/club/ratings', input)
      return data.data as RatingSummary
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club'] })
      queryClient.invalidateQueries({ queryKey: ['club-ratings'] })
    },
  })
}

/** 管理端：修改俱乐部信息 */
export function useUpdateClub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; slogan: string; description: string; avatar: string }) => {
      const { data } = await apiClient.put('/admin/club', input)
      return data.data as Club
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['club'] }),
  })
}
