// Shared client-side fetch helper for the app/api routes.
//
// Centralizes JSON handling + error surfacing so client components/stores don't
// each re-implement `fetch(...).then(r => r.json())` with ad-hoc error checks.
// Pair with the per-resource connectors in this folder (e.g. lib/api/audit.ts).
//
// Two entrypoints:
//   • apiFetch  — returns the parsed JSON body as-is (for routes that return a
//                 bare object, e.g. GET /api/audit → { data, count, ... }).
//   • apiData   — unwraps the standard { success, data, message } envelope used
//                 by apiOk/apiError, returning just `data`.

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* empty / non-JSON body */
  }

  if (!res.ok) {
    const message = (body as { message?: string })?.message ?? `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }

  return body as T
}

// Unwrap the standard { success, data, message } envelope (apiOk/apiError).
export async function apiData<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await apiFetch<{ success?: boolean; data?: T; message?: string }>(path, init)
  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) throw new ApiError(body.message ?? 'Request failed', 400)
    return body.data as T
  }
  return body as unknown as T
}
