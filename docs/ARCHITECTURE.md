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
    lib/db/              Supabase DB clients (browser / server / middleware / anon)
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

## Frozen boundary (do not edit)

- **`supabase/`** (top-level: migrations + edge functions) — the Supabase CLI
  project. The name is mandated by the CLI; it owns the database schema and the
  deployed edge functions, and must not be renamed or edited.

The app's Supabase **client** code is a separate concern and lives in
**`shared/lib/db/`** (`client` = browser, `server` = server components,
`proxy` = middleware, `anon-user` = anonymous helper) — named `db`, not
`supabase`, so it doesn't collide with the project folder above. There is no
top-level `lib/` and no compatibility shims: every module resolves directly to
its real `@/features/*` or `@/shared/*` home.

## Route security

`proxy.ts` (root) is the middleware (the project uses `proxy.ts`, not
`middleware.ts`); it delegates to `updateSession` in `shared/lib/db/proxy.ts`.
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
