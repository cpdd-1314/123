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
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(compression())

  // API routes - System & Health
  app.use(env.API_PREFIX, systemRouter)

  // Domain routes
  app.use(`${env.API_PREFIX}/players`, playersRouter)
  app.use(`${env.API_PREFIX}/stats`, statsRouter)
  app.use(`${env.API_PREFIX}/admin`, adminRouter)

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
