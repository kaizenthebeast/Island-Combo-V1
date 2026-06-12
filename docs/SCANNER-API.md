# Island Combo — Scanner API

The integration surface for external apps (e.g. the voucher QR-scanner) covering
**login**, **voucher validation (read)**, and **voucher redemption**.

A ready-to-import Postman collection lives at
[`postman/scanner-api.postman_collection.json`](../postman/scanner-api.postman_collection.json)
— it auto-saves tokens after Login/Refresh.

---

## Basics

| | |
|---|---|
| Base URL | your deployment origin, e.g. `https://<your-site>` (use `http://localhost:3000` in dev) |
| Format | JSON in, JSON out (`Content-Type: application/json`) |
| Auth | `Authorization: Bearer <accessToken>` on every voucher request |
| Required role | the account must be **staff** or **admin** (and active) — customer tokens get `403` |

**Response envelope** (every endpoint):

```jsonc
// success
{ "success": true, "data": { /* … */ }, "message": "optional" }
// failure
{ "success": false, "message": "human-readable reason" }
```

---

## 1. Login

`POST /api/auth/login`

```json
{ "email": "staff@example.com", "password": "••••••••" }
```

**200 →**

```jsonc
{
  "success": true,
  "data": {
    "role": "staff",                  // or "admin"
    "redirectTo": "/admin/dashboard", // browser hint — ignore in an API client
    "accessToken": "eyJhbGciOiJFUzI1NiIs…",  // send as Authorization: Bearer …
    "refreshToken": "v4cu2pp5g3wm",
    "expiresAt": 1781213205,          // unix seconds when accessToken expires
    "tokenType": "bearer"
  }
}
```

**Errors:** `400` invalid credentials (attempts are recorded in the security
audit log) · `400` missing email/password.

### Token lifecycle

Access tokens live ~1 hour (`expiresAt`). When one expires, exchange the
refresh token instead of logging in again:

`POST /api/auth/refresh`

```json
{ "refreshToken": "v4cu2pp5g3wm" }
```

**200 →** same `{ accessToken, refreshToken, expiresAt, tokenType }` bundle —
**store the new refreshToken; the old one is consumed.** `401` → refresh token
invalid/expired: do a full login.

---

## 2. Validate voucher (read a scanned code)

`POST /api/cash-vouchers/validate` — **read-only**, never mutates; safe to call
on every scan before deciding to redeem. Codes are normalized server-side
(trimmed, upper-cased).

```json
{ "code": "CV-2026-549A95AED4" }
```

**200 →**

```jsonc
{
  "success": true,
  "data": {
    "valid": true,            // true ONLY when status === "ACTIVE"
    "status": "ACTIVE",       // ACTIVE | REDEEMED | EXPIRED | CANCELLED | NOT_FOUND
    "reason": "OK",           // OK | NOT_FOUND | ALREADY_REDEEMED | EXPIRED | CANCELLED
    "voucher": {              // present whenever the code exists
      "code": "CV-2026-549A95AED4",
      "amount": 50,
      "recipient_name": "Juan dela Cruz",
      "recipient_email": "juan@example.com",
      "status": "ACTIVE",
      "claimed_at": null,
      "redeemed_recipient_name": null
    }
  }
}
```

An **unknown code is still a 200** with `valid: false, reason: "NOT_FOUND"` —
it's a verdict, not an error. Non-200s: `400` (no code) · `401` (no/invalid
token) · `403` (not staff).

---

## 3. Redeem voucher (release the cash)

`POST /api/cash-vouchers/redeem` — atomically flips an `ACTIVE` voucher to
`REDEEMED` and records the staff user, timestamp, and the person collecting the
cash. **Single-redeem-safe**: if two devices redeem the same code at once,
exactly one succeeds; the other gets `409`.

```json
{
  "code": "CV-2026-549A95AED4",
  "redeemerName": "Person collecting the cash"
}
```

**200 →** `data` is the full redeemed voucher row:

```jsonc
{
  "success": true,
  "data": {
    "id": "3f9b9b3e-…",
    "code": "CV-2026-549A95AED4",
    "amount": 50,
    "status": "REDEEMED",
    "recipient_name": "Juan dela Cruz",
    "recipient_email": "juan@example.com",
    "redeemed_recipient_name": "Person collecting the cash",
    "claimed_at": "2026-06-12T03:21:45.000Z",
    "claimed_by": "<staff user_id>",
    "order_id": null,
    "purchaser_email": "buyer@example.com",
    "created_at": "2026-06-01T10:00:00.000Z"
    // …remaining bookkeeping fields
  },
  "message": "Voucher redeemed."
}
```

**Errors:**

| Status | Meaning |
|---|---|
| `400` | missing `code` or `redeemerName` |
| `401` | no / invalid / expired token |
| `403` | token is not a staff/admin account |
| `404` | code not found |
| `409` | not redeemable (already redeemed, expired, cancelled) or lost a concurrent-redeem race |

Recommended scanner flow: **scan → validate → show amount + recipient → staff
confirms → redeem → show `message` / error.**

---

## Integration notes

- Get a staff account from an Island Combo admin (provisioned via
  **Admin → Users → Staff → Invite Staff**; you set your own password from the
  invite email).
- Don't share tokens between devices; each device should hold its own
  login/refresh pair. Failed logins and API rate-limit hits are recorded in the
  security audit log with IP and user agent.
- All redemption guarantees (staff check, single-redeem, audit trail) are
  enforced in the database — the API cannot be talked out of them.
