import { Router } from 'express'

const router = Router()

router.get('/__ROUTE_NAME__', (req, res) => {
  res.json({ message: '__ROUTE_NAME__ ok' })
})

export default router
