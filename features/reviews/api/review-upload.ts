/** Upload review photos/videos to Storage, separate from saving the review.
 *  Flow: upload file → Storage returns the path → that path is stored in the DB
 *  (review_images) by addProductReview. Filename: {userId}/{timestamp}-{number}.ext */
import { createClient } from '@/lib/supabase/client'

export const REVIEW_MEDIA_BUCKET = 'review-media'
const MAX_FILES = 6

// {userId} folder (required by the storage RLS) + timestamp + random number.
function reviewFileName(userId: string, file: File): string {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const rand = Math.floor(Math.random() * 1_000_000_000)
  return `${userId}/${Date.now()}-${rand}.${ext}`
}

// Uploads each file and returns its storage path. Throws on auth/upload failure
// so the caller can surface it and skip saving the review.
export const uploadReviewMedia = async (files: File[]): Promise<string[]> => {
  if (files.length === 0) return []
  if (files.length > MAX_FILES) throw new Error(`You can attach up to ${MAX_FILES} files.`)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to upload review media.')

  return Promise.all(
    files.map(async (file) => {
      const path = reviewFileName(user.id, file)
      const { error } = await supabase.storage
        .from(REVIEW_MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw new Error(`Upload failed: ${error.message}`)
      return path
    }),
  )
}
