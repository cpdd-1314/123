import { createApp } from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { closeDatabase, initDatabase } from './db'
import { startSnapshotScheduler } from './modules/history'

const startServer = async () => {
  try {
    // 数据库初始化（幂等）：建表 + 索引 + 种子数据
    await initDatabase()

    const app = createApp()

    const server = app.listen(env.PORT, () => {
      if (env.NODE_ENV === 'development') {
        console.log(`Server running on http://localhost:${env.PORT}${env.API_PREFIX}`)
      }
    })

    // 排行榜历史快照：启动归档 + 每小时检查周期切换
    startSnapshotScheduler()

    // 优雅关闭
    const shutdown = async () => {
      server.close()
      await closeDatabase()
      process.exit(0)
    }
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  }
}

startServer()
