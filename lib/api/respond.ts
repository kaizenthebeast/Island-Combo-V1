import { NextResponse } from 'next/server'

// Shared HTTP plumbing for route handlers.
//
// Standard response shape:
//   Success → { success: true,  data?,    message? }
//   Failure → { success: false, message }
//
// Every route handler must go through these helpers. No hard-coded status
// numbers and no inline NextResponse.json({ error: '...' }, { status: 401 }).

export const HTTP = {
  OK:           200,
  CREATED:      201,
  NO_CONTENT:   204,
  BAD_REQUEST:  400,
  UNAUTHORIZED: 401,
  FORBIDDEN:    403,
  NOT_FOUND:    404,
  CONFLICT:     409,
  TOO_MANY:     429,
  INTERNAL:     500,
} as const

export type HttpStatus = (typeof HTTP)[keyof typeof HTTP]

export type ApiSuccess<Data> = { success: true; data?: Data; message?: string }
export type ApiFailure       = { success: false; message: string }
export type ApiResponse<Data> = ApiSuccess<Data> | ApiFailure

type InitOptions = {
  status?: number
  headers?: HeadersInit
}

// Success

export function apiOk<Data>(
  payload?: { data?: Data; message?: string },
  init: InitOptions = {},
) {
  const body: ApiSuccess<Data> = { success: true }
  if (payload?.data    !== undefined) body.data    = payload.data
  if (payload?.message !== undefined) body.message = payload.message

  return NextResponse.json(body, {
    status: init.status ?? HTTP.OK,
    headers: init.headers,
  })
}

// Failure

export function apiError(message: string, status: number, init: Omit<InitOptions, 'status'> = {}) {
  return NextResponse.json<ApiFailure>(
    { success: false, message },
    { status, headers: init.headers },
  )
}

// Pass-through for lib results
// Accepts either:
//   A) A LibResult  → { success, status, message?, data? }  (from lib functions)
//   B) A plain data → any object                             (inline route returns)

type LibResult<Data> =
  | { success: true;  status: number; message?: string; data?: Data }
  | { success: false; status: number; message:  string }

type PlainData = Record<string, unknown>

export function apiResult<Data>(result: LibResult<Data>): NextResponse
export function apiResult<Data extends PlainData>(data: Data, status?: number): NextResponse
export function apiResult<Data>(
  resultOrData: LibResult<Data> | PlainData,
  status: number = HTTP.OK,
): NextResponse {
  // LibResult branch — has an explicit `success` boolean
  if ('success' in resultOrData) {
    const result = resultOrData as LibResult<Data>
    if (!result.success) return apiError(result.message, result.status)
    return apiOk<Data>(
      { data: result.data, message: result.message },
      { status: result.status },
    )
  }

  // Plain data branch — just wrap it
  return apiOk<Data>(
    { data: resultOrData as Data },
    { status },
  )
}

// Catch-block helper
// Maps thrown errors to a consistent failure response. `Unauthorized` thrown
// by a lib (e.g. getMyAccount) becomes a 401 instead of a 500.

export function toApiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  if (message === 'Unauthorized') return apiError(message, HTTP.UNAUTHORIZED)
  return apiError(message, HTTP.INTERNAL)
}