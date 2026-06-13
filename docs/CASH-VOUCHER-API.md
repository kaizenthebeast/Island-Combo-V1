# Cash Voucher API Reference

The Cash Voucher API lets integrators purchase-record, retrieve, validate, and
redeem cash vouchers. A voucher is a prepaid, fixed-amount instrument identified
by a display code and a QR-encoded redemption identifier. Customer-scoped
endpoints expose a buyer's own vouchers; back-office endpoints let staff validate
and redeem vouchers at the point of sale.

- **Version:** 1.0
- **Protocol:** HTTPS
- **Format:** JSON request and response bodies (`Content-Type: application/json`)

---

## Table of contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Conventions](#conventions)
4. [Errors](#errors)
5. [The voucher object](#the-voucher-object)
6. [Endpoints](#endpoints)
   - [List my vouchers](#list-my-vouchers)
   - [Generate redemption ID](#generate-redemption-id)
   - [Validate a voucher](#validate-a-voucher)
   - [Redeem a voucher](#redeem-a-voucher)
7. [Status and reason codes](#status-and-reason-codes)

---

## Base URL

```
https://<your-deployment-origin>
```

Use `http://localhost:3000` for local development. All paths in this document are
relative to the base URL.

---

## Authentication

All Cash Voucher endpoints require a bearer access token issued by the
authentication service. Send it in the `Authorization` header on every request:

```
Authorization: Bearer <accessToken>
```

Access tokens are JSON Web Tokens signed with ES256 and verified on every
request. They expire approximately one hour after issuance; use the refresh
endpoint to obtain a new token without re-submitting credentials.

The role encoded in the token determines what a caller may do:

| Endpoint | Required role |
|---|---|
| List my vouchers | any authenticated user |
| Generate redemption ID | any authenticated user (voucher owner) or staff/admin |
| Validate a voucher | `staff` or `admin` |
| Redeem a voucher | `staff` or `admin` |

### Obtain a token

```
POST /api/auth/login
```

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Account email address. |
| `password` | string | Yes | Account password. |

**Example request**

```bash
curl -X POST https://<your-deployment-origin>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "staff@example.com", "password": "••••••••" }'
```

**Example response — `200 OK`**

```json
{
  "success": true,
  "data": {
    "role": "staff",
    "redirectTo": "/admin/dashboard",
    "accessToken": "eyJhbGciOiJFUzI1NiIs…",
    "refreshToken": "v4cu2pp5g3wm",
    "expiresAt": 1781213205,
    "tokenType": "bearer"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `role` | string | Account role: `admin`, `staff`, or `user`. |
| `redirectTo` | string | Web client navigation hint; ignore in non-browser clients. |
| `accessToken` | string | Bearer token for the `Authorization` header. |
| `refreshToken` | string | Token used to obtain a new access token. |
| `expiresAt` | number | Unix time (seconds) at which `accessToken` expires. |
| `tokenType` | string | Always `bearer`. |

**Errors:** `400` — missing `email`/`password`, or invalid credentials.

### Refresh a token

```
POST /api/auth/refresh
```

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `refreshToken` | string | Yes | The `refreshToken` from the most recent login or refresh. |

**Example request**

```bash
curl -X POST https://<your-deployment-origin>/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "v4cu2pp5g3wm" }'
```

**Example response — `200 OK`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJFUzI1NiIs…",
    "refreshToken": "p9zx41ka7mqd",
    "expiresAt": 1781216805,
    "tokenType": "bearer"
  }
}
```

Each refresh returns a new `refreshToken`; the previous one is consumed and must
be replaced by the client.

**Errors:** `400` — missing `refreshToken`. `401` — refresh token invalid or
expired; the client must re-authenticate via `POST /api/auth/login`.

---

## Conventions

### Identifiers

A voucher can be referenced by either of two values, and the validate and redeem
endpoints accept both:

| Identifier | Format | Description |
|---|---|---|
| Display code | `CV-YYYY-XXXXXXXXXX` | Human-readable code printed on the voucher. Normalized server-side (trimmed, upper-cased). |
| Redemption UUID | RFC 4122 UUID | Server-minted identifier encoded in the voucher's QR image. The value decoded from a QR scan is this UUID. |

### Request and response format

All request and response bodies are JSON. Every response uses a consistent
envelope.

**Success**

```json
{ "success": true, "data": { }, "message": "optional" }
```

**Failure**

```json
{ "success": false, "message": "Human-readable reason." }
```

Clients should branch on the `success` field: read `data` when `true`, and
`message` when `false`.

---

## Errors

The API uses standard HTTP status codes. The response body always conforms to the
failure envelope above.

| Status | Meaning |
|---|---|
| `200 OK` | The request succeeded. |
| `400 Bad Request` | Missing or malformed parameters. |
| `401 Unauthorized` | Missing, invalid, or expired access token. |
| `403 Forbidden` | The authenticated account lacks the required role. |
| `404 Not Found` | The referenced voucher does not exist. |
| `409 Conflict` | The voucher is not in a redeemable state, or a concurrent redemption won the race. |
| `500 Internal Server Error` | An unexpected server error. |

> A non-existent code passed to **Validate** is reported as a `200 OK` verdict
> (`valid: false`, `reason: "NOT_FOUND"`), not as a `404`. The `404` status
> applies to **Redeem**.

---

## The voucher object

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Unique voucher identifier. |
| `code` | string | Display code, e.g. `CV-2026-549A95AED4`. |
| `amount` | number | Face value of the voucher. |
| `status` | string | One of `ACTIVE`, `REDEEMED`, `CANCELLED`, `EXPIRED`. |
| `recipient_name` | string | Intended recipient captured at purchase. |
| `recipient_email` | string \| null | Recipient email captured at purchase. |
| `redeemed_recipient_name` | string \| null | Name of the person who collected the cash, captured at redemption. |
| `redemption_uuid` | string \| null | QR-encoded redemption identifier; `null` until generated. |
| `purchaser_id` | string \| null | Buyer's user ID; `null` if the buyer account was deleted. |
| `purchaser_email` | string \| null | Buyer email, retained for lookup. |
| `payment_method` | string \| null | Payment method used at purchase. |
| `payment_reference` | string \| null | Payment processor transaction reference. |
| `claimed_at` | string (ISO 8601) \| null | Redemption timestamp; immutable once set. |
| `claimed_by` | string (UUID) \| null | User ID of the staff member who redeemed the voucher. |
| `created_at` | string (ISO 8601) | Creation timestamp. |
| `updated_at` | string (ISO 8601) | Last-modified timestamp. |

**Example**

```json
{
  "id": "3f9b9b3e-1c2d-4e5f-8a90-1b2c3d4e5f60",
  "code": "CV-2026-549A95AED4",
  "amount": 50,
  "status": "REDEEMED",
  "recipient_name": "Juan dela Cruz",
  "recipient_email": "juan@example.com",
  "redeemed_recipient_name": "Maria Santos",
  "redemption_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "purchaser_id": "9c8b7a6d-…",
  "purchaser_email": "buyer@example.com",
  "payment_method": "paypal",
  "payment_reference": "PAYID-…",
  "claimed_at": "2026-06-12T03:21:45.000Z",
  "claimed_by": "1a2b3c4d-…",
  "created_at": "2026-06-01T10:00:00.000Z",
  "updated_at": "2026-06-12T03:21:45.000Z"
}
```

---

## Endpoints

### List my vouchers

Returns the authenticated user's own vouchers, most recent first. Results are
restricted to the caller by row-level security.

```
GET /api/vouchers
```

**Authorization:** any authenticated user.

**Example request**

```bash
curl https://<your-deployment-origin>/api/vouchers \
  -H "Authorization: Bearer <accessToken>"
```

**Example response — `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "id": "3f9b9b3e-…",
      "code": "CV-2026-549A95AED4",
      "amount": 50,
      "status": "ACTIVE",
      "recipient_name": "Juan dela Cruz",
      "created_at": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

`data` is an array of [voucher objects](#the-voucher-object).

**Errors:** `401` — not authenticated.

---

### Generate redemption ID

Mints (or returns the existing) redemption UUID for a voucher and stores it on the
record. The operation is idempotent: repeated calls return the same identifier.
The redemption UUID is the value encoded into the voucher's QR code. Only
`ACTIVE` vouchers owned by the caller (or accessible to staff/admin) may generate
a redemption ID.

```
POST /api/cash-vouchers/redemption-id
```

**Authorization:** any authenticated user (voucher owner) or staff/admin.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `voucherId` | string (UUID) | Yes | The `id` of the voucher. |

**Example request**

```bash
curl -X POST https://<your-deployment-origin>/api/cash-vouchers/redemption-id \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "voucherId": "3f9b9b3e-1c2d-4e5f-8a90-1b2c3d4e5f60" }'
```

**Example response — `200 OK`**

```json
{
  "success": true,
  "data": {
    "redemptionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "voucher": { }
  },
  "message": "Redemption id ready."
}
```

| Field | Type | Description |
|---|---|---|
| `redemptionId` | string (UUID) \| null | The voucher's redemption identifier. |
| `voucher` | object | The full [voucher object](#the-voucher-object). |

**Errors:** `400` — `voucherId` missing or not a valid UUID. `401` — not
authenticated.

---

### Validate a voucher

Performs a read-only check of a scanned or entered value and returns whether the
voucher exists and is currently redeemable. This endpoint never modifies data and
may be called on every scan. The `code` may be either the redemption UUID (from a
QR scan) or the display code (typed at the counter).

```
POST /api/cash-vouchers/validate
```

**Authorization:** `staff` or `admin`.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Redemption UUID or display code. |

**Example request**

```bash
curl -X POST https://<your-deployment-origin>/api/cash-vouchers/validate \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "CV-2026-549A95AED4" }'
```

**Example response — `200 OK`**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "status": "ACTIVE",
    "reason": "OK",
    "voucher": {
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

| Field | Type | Description |
|---|---|---|
| `valid` | boolean | `true` only when `status` is `ACTIVE`. |
| `status` | string | `ACTIVE`, `REDEEMED`, `EXPIRED`, `CANCELLED`, or `NOT_FOUND`. |
| `reason` | string | `OK`, `NOT_FOUND`, `ALREADY_REDEEMED`, `EXPIRED`, or `CANCELLED`. |
| `voucher` | object | Present when the code exists. Subset of the voucher object: `code`, `amount`, `recipient_name`, `recipient_email`, `status`, `claimed_at`, `redeemed_recipient_name`. |

A code that does not match any voucher returns `200 OK` with
`valid: false`, `status: "NOT_FOUND"`, `reason: "NOT_FOUND"`, and no `voucher`.

**Errors:** `400` — `code` missing. `401` — not authenticated. `403` — caller is
not staff/admin.

---

### Redeem a voucher

Atomically transitions an `ACTIVE` voucher to `REDEEMED`, recording the staff
member, timestamp, and the name of the person collecting the cash. The operation
is single-redemption-safe: if two requests redeem the same voucher concurrently,
exactly one succeeds and the other receives `409 Conflict`. The `code` may be the
redemption UUID or the display code.

```
POST /api/cash-vouchers/redeem
```

**Authorization:** `staff` or `admin`.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Redemption UUID or display code. |
| `redeemerName` | string | Yes | Name of the person collecting the cash. Recorded on the voucher. |

**Example request**

```bash
curl -X POST https://<your-deployment-origin>/api/cash-vouchers/redeem \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "CV-2026-549A95AED4", "redeemerName": "Maria Santos" }'
```

**Example response — `200 OK`**

```json
{
  "success": true,
  "data": {
    "id": "3f9b9b3e-…",
    "code": "CV-2026-549A95AED4",
    "amount": 50,
    "status": "REDEEMED",
    "recipient_name": "Juan dela Cruz",
    "recipient_email": "juan@example.com",
    "redeemed_recipient_name": "Maria Santos",
    "claimed_at": "2026-06-12T03:21:45.000Z",
    "claimed_by": "1a2b3c4d-…",
    "created_at": "2026-06-01T10:00:00.000Z"
  },
  "message": "Voucher redeemed."
}
```

`data` is the full redeemed [voucher object](#the-voucher-object).

**Errors**

| Status | Condition |
|---|---|
| `400` | `code` or `redeemerName` missing. |
| `401` | Not authenticated. |
| `403` | Caller is not staff/admin. |
| `404` | Voucher code not found. |
| `409` | Voucher is not `ACTIVE` (already redeemed, expired, or cancelled), or a concurrent redemption succeeded first. |

---

## Status and reason codes

### Voucher status

| Status | Meaning |
|---|---|
| `ACTIVE` | Issued and redeemable. |
| `REDEEMED` | Already exchanged for cash; not redeemable again. |
| `EXPIRED` | Past validity; not redeemable. |
| `CANCELLED` | Voided; not redeemable. |
| `NOT_FOUND` | Returned by Validate only when no voucher matches the supplied code. |

### Validate reason

| Reason | Meaning |
|---|---|
| `OK` | Voucher is `ACTIVE` and redeemable. |
| `NOT_FOUND` | No voucher matches the supplied code. |
| `ALREADY_REDEEMED` | Voucher has already been redeemed. |
| `EXPIRED` | Voucher has expired. |
| `CANCELLED` | Voucher has been cancelled. |

---

## Typical integration sequence

1. `POST /api/auth/login` with a staff or admin account; store `accessToken` and
   `refreshToken`.
2. When `accessToken` is near or past `expiresAt`, or a request returns `401`,
   call `POST /api/auth/refresh` and replace both stored tokens.
3. Decode the voucher QR to obtain the redemption UUID.
4. `POST /api/cash-vouchers/validate` with that value to confirm the voucher is
   `ACTIVE` and read its amount and recipient.
5. `POST /api/cash-vouchers/redeem` with the same value and the collector's name
   to complete the redemption.
