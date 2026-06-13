'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileDown, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { AdminButton } from '@/shared/components/admin/AdminButton'
import { customToast } from '@/shared/components/common/modals/ToastCustom'

// Per-run summary returned by the import endpoints.
export type ImportResult = {
  totalRows: number
  totalProducts: number
  created: number
  updated: number
  failed: number
  errors: { row: number; slug?: string; message: string }[]
}

type Props = {
  open: boolean
  onClose: () => void
  title: string
  description: string
  /** POST endpoint that accepts raw CSV text and returns { data: ImportResult }. */
  importUrl: string
  /** Link to a downloadable template CSV. */
  templateHref: string
  /** Called after a run that created/updated at least one record (→ refresh). */
  onImported: () => void
}

export default function ImportDialog({
  open,
  onClose,
  title,
  description,
  importUrl,
  templateHref,
  onImported,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setResult(null)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const pickFile = (selected: File | null | undefined) => {
    if (!selected) return
    const isCsv =
      selected.type === 'text/csv' ||
      selected.name.toLowerCase().endsWith('.csv')
    if (!isCsv) {
      customToast.error({ title: 'Invalid file', description: 'Please choose a .csv file.' })
      return
    }
    setFile(selected)
    setResult(null)
  }

  const runImport = async () => {
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const text = await file.text()
      const res = await fetch(importUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? 'Import failed')

      const data = json.data as ImportResult
      setResult(data)

      if (data.created + data.updated > 0) {
        customToast.success({ title: 'Import complete', description: json.message })
        onImported()
      } else if (data.failed > 0) {
        customToast.error({ title: 'Import failed', description: 'No records were imported. See details below.' })
      } else {
        customToast.info({ title: 'Nothing imported', description: 'The file contained no valid rows.' })
      }
    } catch (e) {
      customToast.error({
        title: 'Import failed',
        description: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Template link */}
        <a
          href={templateHref}
          download
          className="inline-flex items-center gap-2 self-start text-sm font-medium text-info hover:underline"
        >
          <FileDown className="h-4 w-4" />
          Download CSV template
        </a>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            pickFile(e.dataTransfer.files?.[0])
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <Upload className="h-7 w-7 text-muted-foreground" />
          {file ? (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {file.name}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); reset() }}
                className="text-muted-foreground hover:text-danger"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Drop a CSV here, or click to browse</p>
              <p className="text-xs text-muted-foreground">Existing rows are matched by slug and updated in place.</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {/* Result summary */}
        {result && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <Stat icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Created" value={result.created} />
              <Stat icon={<CheckCircle2 className="h-4 w-4 text-info" />} label="Updated" value={result.updated} />
              <Stat icon={<AlertTriangle className="h-4 w-4 text-danger" />} label="Failed" value={result.failed} />
              <Stat label="Rows" value={result.totalRows} />
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-danger/20 bg-danger-tint/40">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-danger-tint text-danger-text">
                    <tr>
                      <th className="px-3 py-1.5 font-semibold">Line</th>
                      <th className="px-3 py-1.5 font-semibold">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err, i) => (
                      <tr key={i} className="border-t border-danger/10">
                        <td className="px-3 py-1.5 align-top font-mono text-muted-foreground">{err.row || '—'}</td>
                        <td className="px-3 py-1.5">
                          {err.slug && <span className="font-medium">{err.slug}: </span>}
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton label="Close" variant="secondary" onClick={handleClose} />
          <AdminButton
            label={busy ? 'Importing…' : result ? 'Import again' : 'Import'}
            variant="primary"
            onClick={runImport}
            disabled={!file || busy}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
