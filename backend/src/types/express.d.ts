import type { AdminPayload } from '../middleware/auth'

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload
    }
  }
}
