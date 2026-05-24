'use client'

// useTableUrlState
// Syncs DataTable state (page, pageSize, search, filter, sort) to the URL
// search params. Server components can read those params with `searchParams`
// and pass the matching slice of rows back down.
//
// Search input is debounced locally so we don't push a new URL on every
// keystroke.

import { useCallback, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type SortDir = 'asc' | 'desc'

export type TableUrlState = {
  page: number
  pageSize: number
  search: string
  filter: string
  sortKey?: string
  sortDir?: SortDir
}

export type TableUrlDefaults = {
  pageSize?: number
  filter?: string
  sortKey?: string
  sortDir?: SortDir
}

const SEARCH_DEBOUNCE_MS = 350

export function useTableUrlState(defaults: TableUrlDefaults = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const state: TableUrlState = {
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || defaults.pageSize || 10,
    search: searchParams.get('search') ?? '',
    filter: searchParams.get('filter') ?? defaults.filter ?? '',
    sortKey: searchParams.get('sortKey') ?? defaults.sortKey,
    sortDir: (searchParams.get('sortDir') as SortDir) ?? defaults.sortDir,
  }

  // Local mirror of the search input, so typing feels instant but the URL
  // (and refetch) only update after the user pauses.
  const [searchInput, setSearchInput] = useState(state.search)
  useEffect(() => { setSearchInput(state.search) }, [state.search])

  const push = useCallback(
    (next: Partial<TableUrlState>) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged: Record<string, string | number | undefined> = {
        page: next.page ?? state.page,
        pageSize: next.pageSize ?? state.pageSize,
        search: next.search ?? state.search,
        filter: next.filter ?? state.filter,
        sortKey: next.sortKey ?? state.sortKey,
        sortDir: next.sortDir ?? state.sortDir,
      }

      // Drop default / empty values from the URL so it stays clean.
      const setOrDelete = (key: string, value: string | number | undefined, defaultValue?: string | number) => {
        if (value === undefined || value === '' || value === null || value === defaultValue) {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      }

      setOrDelete('page', merged.page, 1)
      setOrDelete('pageSize', merged.pageSize, defaults.pageSize ?? 10)
      setOrDelete('search', merged.search, '')
      setOrDelete('filter', merged.filter, defaults.filter ?? '')
      setOrDelete('sortKey', merged.sortKey, defaults.sortKey)
      setOrDelete('sortDir', merged.sortDir, defaults.sortDir)

      const qs = params.toString()
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [
      router,
      pathname,
      searchParams,
      state.page,
      state.pageSize,
      state.search,
      state.filter,
      state.sortKey,
      state.sortDir,
      defaults.pageSize,
      defaults.filter,
      defaults.sortKey,
      defaults.sortDir,
    ],
  )

  // Debounce search input → URL.
  useEffect(() => {
    if (searchInput === state.search) return
    const handle = setTimeout(() => {
      push({ search: searchInput, page: 1 })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
    // We intentionally exclude `push` and `state.search` to avoid resetting
    // the timer on every render — it only needs to react to the input value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  return {
    state,
    isPending,

    // Search has special handling: write to local state immediately, URL after debounce.
    searchInput,
    setSearchInput,

    setPage:     (page: number)               => push({ page }),
    setPageSize: (size: number)               => push({ pageSize: size, page: 1 }),
    setFilter:   (filter: string)             => push({ filter, page: 1 }),
    setSort:     (sortKey: string, sortDir: SortDir) => push({ sortKey, sortDir }),
  }
}
