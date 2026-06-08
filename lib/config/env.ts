// Compatibility shim. The real config moved to shared/config (enterprise
// restructure), but the frozen Supabase client files (lib/supabase/*) import
// `@/shared/config/env` and cannot be edited (rules #3/#4). This re-export keeps
// that frozen import resolving. Do not add logic here — edit shared/config/env.
export * from '@/shared/config/env'
