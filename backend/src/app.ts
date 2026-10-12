import express, { Application } from 'express'
import cors from 'cors'
import compression from 'compression'
import path from 'path'
import fs from 'fs'
import 'express-async-errors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { httpLogger } from './middleware/logger'
import { systemRouter } from './modules/system'
import { playersRouter, statsRouter } from './modules/players'
import { adminRouter } from './modules/admin'
import { eventsRouter } from './modules/events'
import { mediaRouter } from './modules/media'
import { clubRouter } from './modules/club'
import { playerPortalRouter } from './modules/player-portal'
import { ordersRouter, publicOrdersRouter } from './modules/orders'
import { historyRouter } from './modules/history'
import { gamesRouter } from './modules/games'

export const createApp = (): Application => {
  const app = express()

  // 信任反向代理（用于协议判定）
  app.set('trust proxy', 1)

  // HTTP request logging
  app.use(httpLogger)

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== '*',
    })
  )

  // Body parsing and compression
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(compression())

  // API routes - System & Health
  app.use(env.API_PREFIX, systemRouter)

  // Domain routes
  // 历史榜需在 playersRouter 之前注册，避免 /history 被 /:id 详情路由拦截
  app.use(`${env.API_PREFIX}/players`, historyRouter)
  app.use(`${env.API_PREFIX}/players`, playersRouter)
  app.use(`${env.API_PREFIX}/stats`, statsRouter)
  app.use(`${env.API_PREFIX}/admin`, adminRouter)

  // 俱乐部信息与评价
  app.use(`${env.API_PREFIX}/club`, clubRouter)

  // 游戏目录：公开读取 + 管理员增删
  app.use(`${env.API_PREFIX}/games`, gamesRouter)

  // 陪玩端账号登录与个人数据
  app.use(`${env.API_PREFIX}/player`, playerPortalRouter)

  // 订单：管理员发单（/admin/orders） + 陪玩接单（/player/orders）
  app.use(env.API_PREFIX, ordersRouter)

  // 订单大厅（公开只读）
  app.use(`${env.API_PREFIX}/orders`, publicOrdersRouter)

  // 图片上传 / 访问（内部路径：/admin/media、/media/:id）
  app.use(env.API_PREFIX, mediaRouter)

  // Realtime (SSE)
  app.use(`${env.API_PREFIX}/events`, eventsRouter)

  // 生产环境：托管前端构建产物，实现同源一体化部署（API + SSE + 静态页）
  const clientDist = path.resolve(process.cwd(), '../frontend/dist')
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }))
    // SPA fallback：非 API 路由一律回落到 index.html（支持前端路由刷新）
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  // Error handling
  app.use(errorHandler)

  return app
}
