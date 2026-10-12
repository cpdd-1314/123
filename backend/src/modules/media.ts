import { Router, Request, Response } from 'express'
import multer from 'multer'
import { pool } from '../db'
import { AppError } from '../middleware/errorHandler'
import { requireAdmin } from '../middleware/auth'

export const mediaRouter: Router = Router()

const MAX_SIZE = 3 * 1024 * 1024 // 3MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new AppError(400, '仅支持 PNG / JPG / WEBP / GIF / SVG 格式的图片'))
      return
    }
    cb(null, true)
  },
})

/**
 * POST /api/admin/media — 上传图片（管理员），返回可访问地址
 */
mediaRouter.post(
  '/admin/media',
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response) => {
    const file = req.file
    if (!file) {
      throw new AppError(400, '请选择要上传的图片')
    }

    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO media (mime, size, data) VALUES ($1, $2, $3) RETURNING id`,
      [file.mimetype, file.size, file.buffer]
    )

    res.status(201).json({
      status: 'ok',
      data: { id: rows[0].id, url: `/api/media/${rows[0].id}`, size: file.size, mime: file.mimetype },
    })
  }
)

/**
 * GET /api/media/:id — 读取图片（公开，带长缓存）
 */
mediaRouter.get('/media/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, '无效的图片ID')
  }

  const { rows } = await pool.query<{ mime: string; data: Buffer }>(
    'SELECT mime, data FROM media WHERE id = $1',
    [id]
  )
  if (rows.length === 0) {
    throw new AppError(404, '图片不存在')
  }

  res.setHeader('Content-Type', rows[0].mime)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(rows[0].data)
})
