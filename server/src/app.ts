import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth.js'
import { statsRouter } from './routes/stats.js'
import { casesRouter } from './routes/cases.js'
import { consentsRouter } from './routes/consents.js'
import { dsarRouter } from './routes/dsar.js'
import { vendorsRouter } from './routes/vendors.js'
import { incidentsRouter } from './routes/incidents.js'
import { businessKycRouter } from './routes/businessKyc.js'
import { activityRouter } from './routes/activity.js'

export function createApp() {
  const app = express()
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean)
  app.use(
    cors({
      origin: corsOrigins?.length ? corsOrigins : process.env.VERCEL ? true : 'http://localhost:5173',
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'savvybee-compliance-api',
      tenant: 'Savvy Bee Limited',
      runtime: process.env.VERCEL ? 'vercel' : 'node',
    })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/activity', activityRouter)
  app.use('/api/cases', casesRouter)
  app.use('/api/consents', consentsRouter)
  app.use('/api/dsar', dsarRouter)
  app.use('/api/vendors', vendorsRouter)
  app.use('/api/incidents', incidentsRouter)
  app.use('/api/business-kyc', businessKycRouter)

  return app
}
