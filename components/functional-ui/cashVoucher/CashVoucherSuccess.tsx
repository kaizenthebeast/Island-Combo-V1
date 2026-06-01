'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Copy, Download, Link as LinkIcon } from 'lucide-react'
import { useQRCode } from '@/hooks/generateQRCode'

type Props = {
  code: string
  amount: number
  recipient: string
  recipientEmail: string | null
  onBuyAgain: () => void
}

type NextStep = {
  title: string
  description: React.ReactNode
  withLink?: boolean
}

const buildNextSteps = (email: string | null): NextStep[] => [
  {
    title: 'Voucher Sent',
    description: email ? (
      <>
        An email with the secure and unique voucher code has been sent to the recipient at{' '}
        <span className="font-semibold text-foreground">{email}</span>
      </>
    ) : (
      'An email with the secure and unique voucher code has been sent to the recipient.'
    ),
  },
  {
    title: 'Bring the ID Matching the Entered Recipient Name',
    description: 'Have your recipient bring a valid ID that matches their details before going to the store.',
  },
  {
    title: 'Go to Island Combo Store',
    description: 'Head to the Island Combo store to pick up the cash',
    withLink: true,
  },
  {
    title: 'Present QR Code & Claim Cash',
    description:
      'At the counter, recipient presents the QR code for validation. Once confirmed, cash is released instantly.',
  },
  {
    title: 'Success Alert Sent',
    description:
      'You will receive an instant email confirming that the cash has been successfully claimed at the branch.',
  },
]

const CashVoucherSuccess = ({
  code,
  amount,
  recipient,
  recipientEmail,
  onBuyAgain,
}: Props) => {
  const { qrDataUrl, generateQR } = useQRCode()
  const [copied, setCopied] = useState(false)

  // The QR encodes the database-generated voucher code (the source of truth).
  useEffect(() => {
    generateQR(code)
    // generateQR is recreated each render; we only want this to run for a new code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard not available — ignore.
    }
  }

  // Renders the whole voucher card (logo, amount, QR, ref, recipient) to a PNG
  // so the downloaded file is the shareable voucher — not just the bare QR.
  const handleDownload = async () => {
    if (!qrDataUrl) return

    const BRAND = '#900036'
    const BRAND_TINT = '#fff0f4'
    const GRAY = '#6b7280'
    const DARK = '#111827'

    const scale = 2
    const W = 360
    const H = 420

    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

    const rrect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
    }

    // Solid white background filling the whole canvas (no transparent corners).
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // Logo + "Island Combo", centered as a group.
    try {
      const logo = await loadImage('/images/logo.png')
      const logoSize = 36
      const gap = 8
      ctx.font = 'bold 20px sans-serif'
      const title = 'Island Combo'
      const groupW = logoSize + gap + ctx.measureText(title).width
      const startX = (W - groupW) / 2
      ctx.drawImage(logo, startX, 20, logoSize, logoSize)
      ctx.fillStyle = BRAND
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(title, startX + logoSize + gap, 20 + logoSize / 2)
    } catch {
      // Logo failed to load — skip it, keep the rest of the card.
    }

    // Brand band: "Redeemable as cash in store" + amount.
    const bandX = 24
    const bandY = 76
    const bandW = W - 48
    const bandH = 70
    rrect(bandX, bandY, bandW, bandH, 12)
    ctx.fillStyle = BRAND
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '12px sans-serif'
    ctx.fillText('Redeemable as cash in store', W / 2, bandY + 26)
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText(`$${amount.toLocaleString()}`, W / 2, bandY + 56)

    // QR code.
    const qr = await loadImage(qrDataUrl)
    const qrSize = 150
    const qrY = bandY + bandH + 20
    ctx.drawImage(qr, (W - qrSize) / 2, qrY, qrSize, qrSize)

    // Reference code.
    const refY = qrY + qrSize + 28
    ctx.fillStyle = DARK
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(code, W / 2, refY)

    // Recipient row.
    const rowX = 24
    const rowW = W - 48
    const rowH = 36
    const rowY = refY + 16
    rrect(rowX, rowY, rowW, rowH, 8)
    ctx.fillStyle = BRAND_TINT
    ctx.fill()
    ctx.textBaseline = 'middle'
    ctx.font = '12px sans-serif'
    ctx.fillStyle = GRAY
    ctx.textAlign = 'left'
    ctx.fillText('Recipient name:', rowX + 12, rowY + rowH / 2)
    ctx.fillStyle = DARK
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(recipient, rowX + rowW - 12, rowY + rowH / 2)

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${code}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const nextSteps = buildNextSteps(recipientEmail)

  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {/* Left: confirmation + voucher card */}
      <div className="flex flex-col items-center text-center">
        <Image src="/images/checkCircle.png" alt="Success" width={64} height={64} />
        <h2 className="mt-3 text-xl font-bold">Payment Successful</h2>
        <p className="text-sm text-muted-foreground">Your receipt was sent to your email.</p>

        <div className="mt-6 w-full max-w-xs rounded-xl overflow-hidden border border-gray-100 shadow-sm">
          {/* Brand band */}
          <div className="relative bg-brand text-white p-4 text-left">
            <p className="text-xs opacity-90">Redeemable as cash in store</p>
            <p className="text-2xl font-bold mt-1">${amount.toLocaleString()}</p>
            <span className="absolute top-3 right-3 text-[10px] bg-white text-brand rounded px-2 py-0.5 font-semibold">
              Pending Claim
            </span>
          </div>

          {/* QR + details */}
          <div className="bg-white p-4 flex flex-col items-center gap-3">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="Voucher QR code"
                width={150}
                height={150}
                unoptimized
                className="w-36 h-36 object-contain"
              />
            ) : (
              <div className="w-36 h-36 bg-gray-100 animate-pulse rounded" />
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 text-sm font-medium hover:text-brand transition-colors"
            >
              {code}
              <Copy size={14} className="text-brand" />
            </button>
            {copied && <span className="text-xs text-green-600 -mt-2">Copied!</span>}

            <div className="w-full bg-brand-tint rounded-md px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Recipient name:</span>
              <span className="font-semibold">{recipient}</span>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="w-full py-2.5 rounded-full bg-brand text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              Download QR
            </button>
          </div>
        </div>
      </div>

      {/* Right: what's next */}
      <div>
        <h3 className="text-lg font-bold">What&apos;s next?</h3>
        <ol className="mt-4 space-y-4">
          {nextSteps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-md bg-brand-tint text-brand text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
                  {s.title}
                  {s.withLink && <LinkIcon size={13} className="text-brand" />}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onBuyAgain}
          className="mt-6 w-full py-3 rounded-full border border-brand text-brand font-semibold text-sm hover:bg-brand hover:text-white transition-colors"
        >
          Buy again
        </button>
      </div>
    </div>
  )
}

export default CashVoucherSuccess
