import path from 'node:path'
import fs from 'node:fs'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 3000
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = createApp()
app.listen(PORT, () => {
  console.log(`Compliance API listening on http://localhost:${PORT}`)
})
