import path from 'node:path'
import fs from 'node:fs'
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

const PORT = Number(process.env.PORT) || 3000
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'savvybee-compliance-api', tenant: 'Savvy Bee Limited' })
})

app.use('/api/auth', authRouter)
app.use('/api/stats', statsRouter)
app.use('/api/cases', casesRouter)
app.use('/api/consents', consentsRouter)
app.use('/api/dsar', dsarRouter)
app.use('/api/vendors', vendorsRouter)
app.use('/api/incidents', incidentsRouter)
app.use('/api/business-kyc', businessKycRouter)

app.listen(PORT, () => {
  console.log(`Compliance API listening on http://localhost:${PORT}`)
})
