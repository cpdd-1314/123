import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'

const COOKIE_NAME = 'peiwan_token'

export interface AdminPayload {
  sub: string
  username: string
  role: 'admin'
}

/** 从请求 cookie 中解析 JWT，失败抛 401 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  // CSRF 防护：cookie 为 SameSite=Lax，再校验 Origin 必须与 Host 同源
  const origin = req.headers.origin
  if (origin && !isTrustedOrigin(req, origin)) {
    throw new AppError(403, '非法请求来源')
  }

  const token = parseCookie(req.headers.cookie, COOKIE_NAME)
  if (!token) {
    throw new AppError(401, '未登录，请先登录后台')
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminPayload
    if (payload.role !== 'admin') {
      throw new AppError(401, '登录已过期，请重新登录')
    }
    req.admin = payload
    next()
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(401, '登录已过期，请重新登录')
  }
}

/**
 * 判断请求来源是否可信：
 * 1) 与请求 Host 同源（线上部署、任意自定义域名均可通过）
 * 2) 本地开发地址
 * 3) 显式配置的 TRUSTED_ORIGINS 白名单（支持通配符 *，如 https://*.onrender.com）
 */
export function isTrustedOrigin(req: Request, origin: string): boolean {
  const normalized = origin.replace(/\/$/, '')

  // 本地开发
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    return true
  }

  // 与请求 Host 同源：https://<host> 或 http://<host>
  // 兼容反向代理（Render / Nginx 等）——优先取 X-Forwarded-Host
  const candidates = new Set<string>()
  const host = req.headers.host
  if (host) candidates.add(host)
  const fwdHost = req.headers['x-forwarded-host']
  if (typeof fwdHost === 'string' && fwdHost) {
    candidates.add(fwdHost.split(',')[0].trim())
  }
  const fwdProto = req.headers['x-forwarded-proto']
  const proto = typeof fwdProto === 'string' && fwdProto ? fwdProto.split(',')[0].trim() : undefined

  for (const h of candidates) {
    if (!h) continue
    if (normalized === `https://${h}` || normalized === `http://${h}`) return true
  }
  // 协议被代理改写时，仅比较 host 部分
  if (proto) {
    for (const h of candidates) {
      if (h && normalized === `${proto}://${h}`) return true
    }
  }

  // 显式白名单（逗号分隔，支持 * 通配）
  const allowList = env.TRUSTED_ORIGINS ?? ''
  if (!allowList.trim()) return false

  return allowList
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .some((pattern) => {
      if (!pattern.includes('*')) return pattern === normalized
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
      return new RegExp(`^${escaped}$`).test(normalized)
    })
}

export function signAdminToken(username: string): string {
  return jwt.sign({ sub: username, username, role: 'admin' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}
