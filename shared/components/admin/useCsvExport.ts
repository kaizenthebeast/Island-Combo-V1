'use client'

import { useState, useCallback } from 'react'
import { customToast } from '@/shared/components/common/modals/ToastCustom'

// Triggers a CSV download from an admin export endpoint. Fetches via XHR (rather
// than a plain link) so the admin auth cookie rides along and any error envelope
// surfaces as a toast instead of dumping JSON into a downloaded file.
export function useCsvExport() {
  const [exporting, setExporting] = useState(false)

  const exportCsv = useCallback(async (url: string, fallbackName: string) => {
    setExporting(true)
    try {
      const res = await fetch(url, { headers: { Accept: 'text/csv' } })
      if (!res.ok) {
        let message = `Export failed (${res.status})`
        try {
          const json = await res.json()
          message = json?.message ?? message
        } catch {
          /* non-JSON error body */
        }
        throw new Error(message)
      }

      const blob = await res.blob()
      // Prefer the server-provided filename from Content-Disposition.
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? fallbackName

      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (e) {
      customToast.error({
        title: 'Export failed',
        description: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setExporting(false)
    }
  }, [])

  return { exporting, exportCsv }
}
