# Architecture

An enterprise, **feature-first** Next.js (App Router) e-commerce codebase. Code is
grouped by **business domain**, not by file type, so a feature can grow (and be
owned by a team) in isolation.

## Layers

```
app/        ──▶  features/        ──▶  shared/
routing          domain logic          cross-cutting infra
```

- **`app/`** — routing only. Pages, layouts, and `route.ts` handlers stay thin:
  they parse input, call into a feature, and shape the response. Route groups
  `(auth)` / `(shop)` / `(admin)` organize URLs without affecting them; dynamic
  segments use `[slug]` / `[id]`.
- **`features/<domain>/`** — one self-contained module per domain. Internal shape:
  ```
  features/<domain>/
    api/          server data-access (Supabase) + admin/ ops + connector (typed fetch)
    components/    domain UI (+ components/admin/ for admin dialogs)
    stores/        Zustand stores
    validations/   Zod schemas
    index.ts       PUBLIC API barrel — the only entry point others should import
  ```
  Not every feature has every folder — only what exists.
- **`shared/`** — cross-cutting concerns reused across features:
  ```
  shared/
    components/ui/        shadcn (generated — leave intact)
    components/layout/    Navbar, Footer, MobileBottomNav, SearchBar
    components/common/    cross-feature widgets, modals, icons
    components/admin/     shared admin UI: DataTable, PageHeader, AdminButton, charts, sidebar
    lib/http/            base API client + route-handler helpers (apiOk/apiError, rate-limiter)
    lib/paypal/          PayPal SDK helpers
    lib/admin/           admin pagination helpers (pure)
    config/  utils/  types/  hooks/
  ```

## Dependency rules

- `app/` may import from `features/` and `shared/`.
- `features/` may import from `shared/` and (sparingly) another feature's **public
  barrel** — never another feature's internals.
- `shared/` must **not** import from `features/`.
- Cross-feature use goes through `@/features/<domain>` (the barrel), not deep paths.

## Conventions

- **Path aliases** (`tsconfig.json`): `@/*` → repo root, plus explicit
  `@/features/*` and `@/shared/*`.
- **Imports:** existing code uses deep feature paths (`@/features/orders/api/...`);
  **new** cross-feature/app code should import the **barrel** (`@/features/orders`).
  Barrel-only enforcement is being adopted incrementally to avoid introducing
  circular dependencies in one risky pass.
- **Barrels export logic** (api/validations), **not** client components — so a
  server barrel never drags a `"use client"` module (or vice-versa) into the wrong
  bundle. Import components by path.
- **Type safety:** Zod schemas live in each feature's `validations/`; shared and
  Supabase-derived types live in `shared/types/`.
- **Naming:** route segments and shadcn files keep their existing casing; new
  shared/feature folders are kebab-case.

## Frozen boundaries (do not edit)

- **`supabase/`** (top-level: migrations + edge functions) — frozen.
- **`lib/supabase/`** — the Supabase client wrapper. Kept at `@/lib/supabase`
  (not relocated) because a frozen file self-imports `@/lib/supabase/client`;
  moving it would require editing frozen content or duplicating the folder.
  Contents are frozen **except `proxy.ts`** (the middleware), which may have its
  import paths / route references updated to stay correct.
- **`lib/config/`** — a thin re-export **shim** to `@/shared/config` so the frozen
  client files (which import `@/lib/config/env`) keep resolving after config moved.
- `lib/admin/index.ts`, `lib/validations/index.ts`, `stores/index.ts` are
  **compatibility aggregator barrels** that re-export from the new feature/shared
  locations, so any lingering legacy imports keep working.

## Route security

`proxy.ts` (root) is the middleware (the project uses `proxy.ts`, not
`middleware.ts`); it delegates to `updateSession` in `lib/supabase/proxy.ts`.
Guarded routes (unchanged by this restructure — URLs come from `app/`):

| Class      | Routes                          | Rule                                  |
|------------|---------------------------------|---------------------------------------|
| Protected  | `/protected`, `/checkout/address` | require a non-anonymous user → else `/auth/login` |
| Admin      | `/admin/*`                      | require `profile.role = 'admin'` → else `/auth/login` |
| Audit      | `/admin/audit/*`                | explicit admin guard (defense-in-depth) |

## Adding a new feature

1. `mkdir features/<domain>` with the subfolders you need (`api/`, `components/`,
   `stores/`, `validations/`).
2. Put server data-access in `api/`, UI in `components/`, schemas in
   `validations/`. Admin-only ops go in `api/admin/`, admin UI in
   `components/admin/`.
3. Add `features/<domain>/index.ts` exporting the public API (logic, not client
   components).
4. Add routes under the right `app/(group)/...` segment; keep the page/handler
   thin and call into `@/features/<domain>`.
5. Reuse infra from `@/shared/*`. Never import another feature's internals — only
   its barrel.
