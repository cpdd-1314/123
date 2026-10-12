import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'

export type OrderStatus = 'open' | 'taken' | 'done' | 'canceled'

export interface Order {
  id: number
  title: string
  game: string
  description: string
  price: number
  duration: number
  customerNote: string
  status: OrderStatus
  assignedPlayerId: number | null
  assignedPlayerName: string | null
  takenById: number | null
  takenByName: string | null
  takenAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderPayload {
  title: string
  game: string
  description?: string
  price?: number
  duration?: number
  customerNote?: string
  assignedPlayerId?: number | null
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  open: '待接单',
  taken: '进行中',
  done: '已完成',
  canceled: '已取消',
}

// ---- 管理端 ----

/** 后台：订单列表 */
export function useAdminOrders(status?: string) {
  return useQuery<Order[]>({
    queryKey: ['admin-orders', status ?? 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/orders', {
        params: status && status !== 'all' ? { status } : {},
      })
      return data.data as Order[]
    },
    staleTime: 15 * 1000,
  })
}

/** 后台：新建订单 */
export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: OrderPayload) => {
      const { data } = await apiClient.post('/admin/orders', payload)
      return data.data as Order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['public-orders'] })
    },
  })
}

/** 后台：编辑订单 / 指派 / 改状态 */
export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<OrderPayload> & { id: number; status?: OrderStatus }) => {
      const { data } = await apiClient.put(`/admin/orders/${id}`, payload)
      return data.data as Order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['public-orders'] })
      qc.invalidateQueries({ queryKey: ['player-orders'] })
    },
  })
}

/** 后台：删除订单 */
export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/orders/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['public-orders'] })
    },
  })
}

// ---- 陪玩端 ----

/** 陪玩：可见订单列表 */
export function usePlayerOrders(enabled = true) {
  return useQuery<Order[]>({
    queryKey: ['player-orders'],
    queryFn: async () => {
      const { data } = await apiClient.get('/player/orders')
      return data.data as Order[]
    },
    enabled,
    staleTime: 10 * 1000,
  })
}

/** 陪玩：接单 */
export function useTakeOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/player/orders/${id}/take`)
      return data.data as Order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-orders'] })
      qc.invalidateQueries({ queryKey: ['player-me'] })
      qc.invalidateQueries({ queryKey: ['public-orders'] })
    },
  })
}

/** 陪玩：标记完成 */
export function useCompleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/player/orders/${id}/complete`)
      return data.data as Order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-orders'] })
      qc.invalidateQueries({ queryKey: ['player-me'] })
      qc.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

// ---- 公开订单大厅 ----

export function usePublicOrders() {
  return useQuery<Order[]>({
    queryKey: ['public-orders'],
    queryFn: async () => {
      const { data } = await apiClient.get('/orders')
      return data.data as Order[]
    },
    staleTime: 20 * 1000,
  })
}
