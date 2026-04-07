import path from 'node:path'
import fs from 'node:fs'
import type { Response } from 'express'
import type { CaseDocument } from '@prisma/client'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')

export function useVercelBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

export function uploadsConfigured(): boolean {
  if (process.env.VERCEL && !useVercelBlob()) return false
  return true
}

export async function saveUploadedFile(input: {
  originalname: string
  mimetype: string
  buffer: Buffer
}): Promise<{ storageKey: string }> {
  if (useVercelBlob()) {
    const { put } = await import('@vercel/blob')
    const safeName = input.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blob = await put(`compliance/${Date.now()}-${safeName}`, input.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      contentType: input.mimetype || 'application/octet-stream',
    })
    return { storageKey: blob.url }
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const { randomUUID } = await import('node:crypto')
  const ext = path.extname(input.originalname) || '.bin'
  const filename = `${randomUUID()}${ext}`
  const fp = path.join(UPLOAD_DIR, filename)
  fs.writeFileSync(fp, input.buffer)
  return { storageKey: filename }
}

export function sendDocumentFile(doc: CaseDocument, res: Response) {
  if (doc.storageKey.startsWith('https://')) {
    res.redirect(302, doc.storageKey)
    return
  }
  const fp = path.join(UPLOAD_DIR, doc.storageKey)
  if (!fs.existsSync(fp)) {
    res.status(404).json({ error: 'File missing on disk' })
    return
  }
  res.download(fp, doc.originalFilename)
}
