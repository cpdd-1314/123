import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

/**
 * 把「存在但为空字符串」的环境变量视为未设置，
 * 这样 .default() 才能真正兜底（云平台常注入空值占位）。
 */
const nonEmpty = (key: string): string | undefined => {
  const raw = process.env[key]
  return raw === undefined || raw.trim() === '' ? undefined : raw
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_PREFIX: z.string().default('/api'),

  CORS_ORIGIN: z.string().refine(
    (val) => val === '*' || z.string().url().safeParse(val).success,
    { message: 'CORS_ORIGIN must be a valid URL or "*" for all origins' }
  ).default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Database
  DATABASE_URL: z.string().default('postgres://postgres:Tencent2025@localhost:5432/genie'),

  // Admin auth (JWT stored in httpOnly cookie)
  JWT_SECRET: z.string().min(8).default('peiwan-admin-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().min(4).default('admin123'),

  // 可信来源白名单（逗号分隔，支持 * 通配）。同源请求始终放行，此处用于额外放行跨域来源。
  TRUSTED_ORIGINS: z.string().default(''),
})

const parseEnv = () => {
  const source = {
    NODE_ENV: nonEmpty('NODE_ENV'),
    PORT: nonEmpty('PORT'),
    API_PREFIX: nonEmpty('API_PREFIX'),
    CORS_ORIGIN: nonEmpty('CORS_ORIGIN'),
    RATE_LIMIT_WINDOW_MS: nonEmpty('RATE_LIMIT_WINDOW_MS'),
    RATE_LIMIT_MAX_REQUESTS: nonEmpty('RATE_LIMIT_MAX_REQUESTS'),
    DATABASE_URL: nonEmpty('DATABASE_URL'),
    JWT_SECRET: nonEmpty('JWT_SECRET'),
    JWT_EXPIRES_IN: nonEmpty('JWT_EXPIRES_IN'),
    ADMIN_USERNAME: nonEmpty('ADMIN_USERNAME'),
    ADMIN_PASSWORD: nonEmpty('ADMIN_PASSWORD'),
    TRUSTED_ORIGINS: nonEmpty('TRUSTED_ORIGINS'),
  }

  const result = envSchema.safeParse(source)

  if (!result.success) {
    // 逐项列出缺失/非法变量，便于在云平台日志中直接定位
    const details = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    console.error(
      `❌ 环境变量校验失败，请检查以下配置后重新部署:\n${details}\n` +
        `提示: ADMIN_PASSWORD 至少 4 位，JWT_SECRET 至少 8 位。`
    )
    process.exit(1)
  }

  const parsed = result.data

  // 生产环境安全提醒：检测是否仍在用默认 JWT_SECRET
  if (parsed.NODE_ENV === 'production') {
    if (parsed.JWT_SECRET === 'peiwan-admin-secret-change-me') {
      console.warn('⚠️  正在使用默认 JWT_SECRET，请在环境变量中设置为随机长字符串')
    }
  }

  return parsed
}

export const env = parseEnv()
