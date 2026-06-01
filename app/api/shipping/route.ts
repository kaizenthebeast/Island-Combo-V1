import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

type GCRRow = {
  zone: string
  min: number
  r1k: number
  r45k: number
  r100k: number
  r300k: number
  r500k: number
  r1000k: number
}

type QPIRow = {
  zone: string
  b0_8: number
  b9_16: number
  b17_31: number
  b32_45: number
}

type Item = { weightKg: number; qty: number }

const regularGCR: GCRRow[] = [
  { zone: 'GUM_KSA_TKK',     min: 111, r1k: 7.60,  r45k: 6.00,  r100k: 4.50,  r300k: 4.50,  r500k: 4.50,  r1000k: 4.50 },
  { zone: 'OTHER_MICRONESIA',min: 111, r1k: 9.40,  r45k: 8.00,  r100k: 5.65,  r300k: 5.65,  r500k: 5.65,  r1000k: 5.65 },
  { zone: 'JP_MNL_TPE',      min: 121, r1k: 10.40, r45k: 8.35,  r100k: 6.25,  r300k: 6.25,  r500k: 6.25,  r1000k: 6.25 },
  { zone: 'HNL',             min: 144, r1k: 13.65, r45k: 10.40, r100k: 7.75,  r300k: 7.75,  r500k: 7.75,  r1000k: 7.75 },
  { zone: 'LAX_SFO',         min: 144, r1k: 13.65, r45k: 10.80, r100k: 8.35,  r300k: 8.35,  r500k: 8.35,  r1000k: 8.35 },
  { zone: 'DEN_IAH',         min: 144, r1k: 13.65, r45k: 10.80, r100k: 8.60,  r300k: 8.60,  r500k: 8.60,  r1000k: 8.60 },
  { zone: 'ORD_IAD_EWR_JFK', min: 144, r1k: 13.65, r45k: 10.80, r100k: 8.85,  r300k: 8.85,  r500k: 8.85,  r1000k: 8.85 },
  { zone: 'US_ZONES_1_2',    min: 156, r1k: 14.90, r45k: 12.35, r100k: 10.75, r300k: 10.75, r500k: 10.75, r1000k: 10.75 },
  { zone: 'US_ZONES_3_4',    min: 156, r1k: 14.90, r45k: 12.35, r100k: 10.50, r300k: 10.50, r500k: 10.50, r1000k: 10.50 },
  { zone: 'US_ZONES_5_6',    min: 156, r1k: 14.90, r45k: 12.35, r100k: 10.10, r300k: 10.10, r500k: 10.10, r1000k: 10.10 },
]

const hazmatGCR: GCRRow[] = [
  { zone: 'MICRONESIA',      min: 126, r1k: 10.35, r45k: 8.80,  r100k: 6.20,  r300k: 6.20,  r500k: 6.20,  r1000k: 6.20 },
  { zone: 'JP_MNL_TPE',      min: 134, r1k: 11.50, r45k: 9.20,  r100k: 6.90,  r300k: 6.90,  r500k: 6.90,  r1000k: 6.90 },
  { zone: 'HNL',             min: 159, r1k: 15.10, r45k: 11.45, r100k: 8.55,  r300k: 8.55,  r500k: 8.55,  r1000k: 8.55 },
  { zone: 'LAX_SFO',         min: 159, r1k: 15.10, r45k: 11.90, r100k: 9.20,  r300k: 9.20,  r500k: 9.20,  r1000k: 9.20 },
  { zone: 'DEN_IAH',         min: 159, r1k: 15.10, r45k: 11.90, r100k: 9.45,  r300k: 9.45,  r500k: 9.45,  r1000k: 9.45 },
  { zone: 'ORD_IAD_EWR_JFK', min: 159, r1k: 15.10, r45k: 11.90, r100k: 9.75,  r300k: 9.75,  r500k: 9.75,  r1000k: 9.75 },
  { zone: 'US_ZONES_1_2',    min: 172, r1k: 16.40, r45k: 13.60, r100k: 11.85, r300k: 11.85, r500k: 11.85, r1000k: 11.85 },
  { zone: 'US_ZONES_3_4',    min: 172, r1k: 16.40, r45k: 13.60, r100k: 11.55, r300k: 11.55, r500k: 11.55, r1000k: 11.55 },
  { zone: 'US_ZONES_5_6',    min: 172, r1k: 16.40, r45k: 13.60, r100k: 11.10, r300k: 11.10, r500k: 11.10, r1000k: 11.10 },
]

const regularExp: GCRRow[] = [
  { zone: 'MICRONESIA',      min: 155, r1k: 12.75, r45k: 10.80, r100k: 7.65,  r300k: 7.65,  r500k: 7.65,  r1000k: 7.65 },
  { zone: 'JP_MNL_TPE',      min: 164, r1k: 14.10, r45k: 11.30, r100k: 8.45,  r300k: 8.45,  r500k: 8.45,  r1000k: 8.45 },
  { zone: 'HNL',             min: 195, r1k: 18.20, r45k: 13.85, r100k: 10.30, r300k: 10.30, r500k: 10.30, r1000k: 10.30 },
  { zone: 'LAX_SFO',         min: 195, r1k: 18.50, r45k: 14.60, r100k: 11.35, r300k: 11.35, r500k: 11.35, r1000k: 11.35 },
  { zone: 'DEN_IAH',         min: 195, r1k: 18.50, r45k: 14.60, r100k: 11.70, r300k: 11.70, r500k: 11.70, r1000k: 11.70 },
  { zone: 'ORD_IAD_EWR_JFK', min: 195, r1k: 18.50, r45k: 14.60, r100k: 12.05, r300k: 12.05, r500k: 12.05, r1000k: 12.05 },
  { zone: 'US_ZONES_1_2',    min: 211, r1k: 20.30, r45k: 17.30, r100k: 15.05, r300k: 15.05, r500k: 15.05, r1000k: 15.05 },
  { zone: 'US_ZONES_3_4',    min: 211, r1k: 20.30, r45k: 17.30, r100k: 14.70, r300k: 14.70, r500k: 14.70, r1000k: 14.70 },
  { zone: 'US_ZONES_5_6',    min: 211, r1k: 20.30, r45k: 17.30, r100k: 14.15, r300k: 14.15, r500k: 14.15, r1000k: 14.15 },
]

const QPI: QPIRow[] = [
  { zone: 'MICRONESIA',   b0_8: 165, b9_16: 265, b17_31: 345, b32_45: 450 },
  { zone: 'JP_MNL_TPE',   b0_8: 165, b9_16: 260, b17_31: 340, b32_45: 445 },
  { zone: 'HNL',          b0_8: 195, b9_16: 250, b17_31: 330, b32_45: 455 },
  { zone: 'US_ZONES_1_2', b0_8: 210, b9_16: 270, b17_31: 380, b32_45: 515 },
  { zone: 'US_ZONES_3_4', b0_8: 205, b9_16: 260, b17_31: 370, b32_45: 500 },
  { zone: 'US_ZONES_5_6', b0_8: 200, b9_16: 255, b17_31: 360, b32_45: 490 },
]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function gcrRateForWeight(row: GCRRow, weightKg: number): number {
  if (weightKg < 45) return row.r1k
  if (weightKg < 100) return row.r45k
  if (weightKg < 300) return row.r100k
  if (weightKg < 500) return row.r300k
  if (weightKg < 1000) return row.r500k
  return row.r1000k
}

function qpiPricePerPiece(row: QPIRow, weightKg: number): number | null {
  if (weightKg <= 8) return row.b0_8
  if (weightKg <= 16) return row.b9_16
  if (weightKg <= 31) return row.b17_31
  if (weightKg <= 45) return row.b32_45
  return null
}

function calcGCR(rows: GCRRow[], zone: string, totalWeightKg: number) {
  const row = rows.find((r) => r.zone === zone)
  if (!row) return null
  const ratePerKg = gcrRateForWeight(row, totalWeightKg)
  const weightCost = totalWeightKg * ratePerKg
  const appliedMin = weightCost < row.min
  const cost = appliedMin ? row.min : weightCost
  return {
    cost: round2(cost),
    ratePerKg,
    minCharge: row.min,
    weightCost: round2(weightCost),
    appliedMin,
  }
}

function calcQPI(zone: string, items: Item[]) {
  const row = QPI.find((r) => r.zone === zone)
  if (!row) return null
  const breakdown: Array<{ weightKg: number; qty: number; pricePerPiece: number; subtotal: number }> = []
  let total = 0
  for (const item of items) {
    const price = qpiPricePerPiece(row, item.weightKg)
    if (price === null) return null
    const subtotal = price * item.qty
    total += subtotal
    breakdown.push({ weightKg: item.weightKg, qty: item.qty, pricePerPiece: price, subtotal })
  }
  return { cost: round2(total), breakdown }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body = await request.json()
    const { zone, country, postalCode, items } = body as {
      zone?: string
      country?: string
      postalCode?: string
      items?: Item[]
    }

    if (!zone || typeof zone !== 'string') {
      return apiError("Missing or invalid 'zone'", HTTP.BAD_REQUEST)
    }

    const normalizedItems: Item[] =
      Array.isArray(items) && items.length > 0
        ? items.map((i) => ({
            weightKg: Number(i.weightKg) > 0 ? Number(i.weightKg) : 1,
            qty: Math.max(1, Math.floor(Number(i.qty)) || 1),
          }))
        : [{ weightKg: 1, qty: 1 }]

    const totalWeightKg = normalizedItems.reduce((sum, i) => sum + i.weightKg * i.qty, 0)
    const totalPieces = normalizedItems.reduce((sum, i) => sum + i.qty, 0)

    const gcr = calcGCR(regularGCR, zone, totalWeightKg)
    const qpi = calcQPI(zone, normalizedItems)

    if (!gcr && !qpi) {
      return apiError(`No shipping rates available for zone '${zone}'`, HTTP.BAD_REQUEST)
    }

    return apiOk({
      data: {
        zone,
        country: country ?? null,
        postalCode: postalCode ?? null,
        totalWeightKg: round2(totalWeightKg),
        totalPieces,
        options: {
          ...(gcr ? { gcr } : {}),
          ...(qpi ? { qpi } : {}),
        },
      },
    })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

export { regularGCR, hazmatGCR, regularExp, QPI }
