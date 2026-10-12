import type { AdminPayload } from '../middleware/auth'
import type { PlayerPayload } from '../middleware/player-auth'

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload
      player?: PlayerPayload
    }
  }
}
