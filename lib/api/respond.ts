import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTTP plumbing for route handlers.
//
// Standard response shape:
//   Success → { success: true,  data?,    message? }
//   Failure → { success: false, message }
//
// Every route handler must go through these helpers. No hard-coded status
// numbers and no inline NextResponse.json({ error: '...' }, { status: 401 }).
// ─────────────────────────────────────────────────────────────────────────────

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

export type ApiSuccess<T> = { success: true; data?: T; message?: string }
export type ApiFailure    = { success: false; message: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

type InitOptions = {
  status?: number
  headers?: HeadersInit
}

// ─── Success ──────────────────────────────────────────────────────────────────

export function apiOk<T>(
  payload?: { data?: T; message?: string },
  init: InitOptions = {},
) {
  const body: ApiSuccess<T> = { success: true }
  if (payload?.data    !== undefined) body.data    = payload.data
  if (payload?.message !== undefined) body.message = payload.message

  return NextResponse.json(body, {
    status: init.status ?? HTTP.OK,
    headers: init.headers,
  })
}

// ─── Failure ──────────────────────────────────────────────────────────────────

export function apiError(message: string, status: number, init: Omit<InitOptions, 'status'> = {}) {
  return NextResponse.json<ApiFailure>(
    { success: false, message },
    { status, headers: init.headers },
  )
}

// ─── Pass-through for lib results ─────────────────────────────────────────────
// Many lib functions return { success, status, message, data? }. Forward them
// to the client without rewriting each route by hand.

type LibResult<T> =
  | { success: true;  status: number; message?: string; data?: T }
  | { success: false; status: number; message:  string }

export function apiResult<T>(result: LibResult<T>) {
  if (!result.success) return apiError(result.message, result.status)
  return apiOk<T>(
    { data: result.data, message: result.message },
    { status: result.status },
  )
}

// ─── Catch-block helper ───────────────────────────────────────────────────────
// Maps thrown errors to a consistent failure response. `Unauthorized` thrown
// by a lib (e.g. getMyAccount) becomes a 401 instead of a 500.

export function toApiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  if (message === 'Unauthorized') return apiError(message, HTTP.UNAUTHORIZED)
  return apiError(message, HTTP.INTERNAL)
}
