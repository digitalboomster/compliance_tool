import serverless from 'serverless-http'
import { createApp } from '../server/dist/app.js'

const app = createApp()
const handler = serverless(app)

/** Vercel function limits (also set in vercel.json). */
export const config = {
  maxDuration: 30,
}

export default handler
