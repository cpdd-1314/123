import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'

export function useAdminAuth() {
  return useQuery<{ username: string }>({
    queryKey: ['admin-me'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/me')
      return data.data
    },
    retry: false,
    staleTime: 60 * 1000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      const { data } = await apiClient.post('/admin/login', creds)
      return data.data as { username: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-me'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/admin/logout')
    },
    onSuccess: () => {
      queryClient.setQueryData(['admin-me'], null)
      queryClient.clear()
    },
  })
}
