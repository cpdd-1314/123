import { Request, Response, NextFunction } from 'express'
import { AnyZodObject } from 'zod'

/**
 * 请求体验证中间件：解析通过后写回 req.body（应用默认值、去除未知字段）
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body)
      next()
    } catch (error) {
      next(error)
    }
  }
}
