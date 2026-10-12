import { Pool } from 'pg'
import { env } from '../config/env'
import { createLogger } from '../config/logger'
import { SCHEMA_SQL } from './schema'

const logger = createLogger('Database')

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error')
})

/**
 * 初始化数据库（幂等）：建表 + 索引 + 种子数据
 */
export async function initDatabase(): Promise<void> {
  await pool.query(SCHEMA_SQL)
  logger.warn('Database schema initialized')
}

export async function closeDatabase(): Promise<void> {
  await pool.end()
}
