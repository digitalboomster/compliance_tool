/**
 * Fails the Vercel build if required outputs are missing (catches wrong root / broken tsc).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = [
  ['server/dist/app.js', 'API bundle (run tsc in server/)'],
  ['web/dist/index.html', 'Vite SPA output'],
  ['api/index.ts', 'Vercel /api serverless entry'],
]

let failed = false
for (const [rel, hint] of required) {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    console.error(`verify-vercel: MISSING ${rel} (${hint})`)
    failed = true
  }
}

if (failed) {
  console.error('verify-vercel: Fix the build before deploying to Vercel.')
  process.exit(1)
}

console.log('verify-vercel: all artifacts present')
