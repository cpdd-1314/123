import axios, { AxiosError } from 'axios'

/**
 * API 客户端：通过 Vite 代理访问 /api（同源，Cookie 自动携带）
 * 登录态由后端 httpOnly Cookie 维护，前端不存储 token
 */
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    return Promise.reject(error)
  }
)

/** 提取用户友好的错误信息 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || '请求失败，请稍后重试'
  }
  if (error instanceof Error) {
    return error.message
  }
  return '未知错误'
}

export default apiClient
