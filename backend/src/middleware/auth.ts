import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'

const COOKIE_NAME = 'peiwan_token'

export interface AdminPayload {
  sub: string
  username: string
}

/** 从请求 cookie 中解析 JWT，失败抛 401 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  // CSRF 防护：cookie 为 SameSite=Lax，再校验 Origin（存在时）
  const origin = req.headers.origin
  if (origin && !origin.startsWith('http://localhost:') && !origin.startsWith('http://127.0.0.1:')) {
    throw new AppError(403, '非法请求来源')
  }

  const token = parseCookie(req.headers.cookie, COOKIE_NAME)
  if (!token) {
    throw new AppError(401, '未登录，请先登录后台')
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminPayload
    req.admin = payload
    next()
  } catch {
    throw new AppError(401, '登录已过期，请重新登录')
  }
}

export function signAdminToken(username: string): string {
  return jwt.sign({ sub: username, username }, env.JWT_SECRET, {
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

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}
