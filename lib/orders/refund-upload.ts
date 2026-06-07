/** Upload refund/return evidence (photos/videos) to the PRIVATE refund-media
 *  bucket, separate from saving the request. Flow: upload → Storage returns the
 *  path → that path is stored on the refund request (refunds.media_paths).
 *  Filename: {userId}/{timestamp}-{number}.ext */
import { createClient } from '@/lib/supabase/client'

export const REFUND_MEDIA_BUCKET = 'refund-media'
const MAX_FILES = 6

function refundFileName(userId: string, file: File): string {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const rand = Math.floor(Math.random() * 1_000_000_000)
  return `${userId}/${Date.now()}-${rand}.${ext}`
}

export const uploadRefundMedia = async (files: File[]): Promise<string[]> => {
  if (files.length === 0) return []
  if (files.length > MAX_FILES) throw new Error(`You can attach up to ${MAX_FILES} files.`)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to upload evidence.')

  return Promise.all(
    files.map(async (file) => {
      const path = refundFileName(user.id, file)
      const { error } = await supabase.storage
        .from(REFUND_MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw new Error(`Upload failed: ${error.message}`)
      return path
    }),
  )
}
