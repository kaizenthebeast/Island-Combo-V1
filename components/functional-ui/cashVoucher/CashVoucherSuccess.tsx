'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Share2, Download, Link as LinkIcon } from 'lucide-react'
import { useQRCode } from '@/helper/qrcode/GenerateQRCode'

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

const buildNextSteps = (email: string): NextStep[] => [
  {
    title: 'Voucher Sent',
    description: (
      <>
        An email has been sent to <span className="font-semibold text-foreground">{email}</span> with
        the secure and unique voucher code
      </>
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

const CashVoucherSuccess = ({ code, amount, recipient, recipientEmail, onBuyAgain }: Props) => {
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

  const handleDownload = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `${code}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const nextSteps = buildNextSteps(recipientEmail ?? 'your email')

  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {/* Left: confirmation + voucher card */}
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="text-green-600" size={26} strokeWidth={3} />
        </div>
        <h2 className="mt-3 text-xl font-bold">Payment Successful</h2>
        <p className="text-sm text-muted-foreground">Your receipt was sent to your email!</p>

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
              className="w-full py-2.5 rounded-full bg-brand text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors"
            >
              <Share2 size={15} />
              Share with Recipient
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="w-full py-2.5 rounded-full border border-brand text-brand text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
