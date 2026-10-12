import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'
import { parseCookie, isTrustedOrigin } from './auth'

const PLAYER_COOKIE = 'peiwan_player'

export interface PlayerPayload {
  sub: number
  username: string
  role: 'player'
}

/** 陪玩端鉴权：从 cookie 解析 JWT，校验角色为 player */
export function requirePlayer(req: Request, _res: Response, next: NextFunction): void {
  // CSRF 防护：与后台一致，校验 Origin 是否可信
  const origin = req.headers.origin
  if (origin && !isTrustedOrigin(req, origin)) {
    throw new AppError(403, '非法请求来源')
  }

  const token = parseCookie(req.headers.cookie, PLAYER_COOKIE)
  if (!token) {
    throw new AppError(401, '未登录，请先登录陪玩账号')
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as unknown as PlayerPayload
    if (payload.role !== 'player') {
      throw new AppError(401, '登录已过期，请重新登录')
    }
    req.player = payload
    next()
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(401, '登录已过期，请重新登录')
  }
}

export function signPlayerToken(playerId: number, username: string): string {
  return jwt.sign({ sub: playerId, username, role: 'player' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function setPlayerCookie(res: Response, token: string): void {
  res.cookie(PLAYER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearPlayerCookie(res: Response): void {
  res.clearCookie(PLAYER_COOKIE, { path: '/' })
}
