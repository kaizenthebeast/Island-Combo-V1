'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Loader2 } from 'lucide-react'
import { getPublicImageUrl } from '@/lib/utils/image-url'

type Suggestion = {
  product_id: number
  name: string
  slug: string
  image_url: string | null
  base_price: number
  final_price: number
  discount: number | null
}

type Props = {
  placeholder?: string
  inputClassName?: string
  onNavigate?: () => void
}

const DEBOUNCE_MS = 200
const MIN_QUERY_LEN = 2
const MAX_CACHE_ENTRIES = 50

export function SearchBar({
  placeholder = 'Search products...',
  inputClassName,
  onNavigate,
}: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map())

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
        setHighlight(-1)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    const q = query.trim()

    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (q.length < MIN_QUERY_LEN) {
      setSuggestions([])
      setLoading(false)
      return
    }

    const cached = cacheRef.current.get(q)
    if (cached) {
      setSuggestions(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      const ctrl = new AbortController()
      abortRef.current = ctrl

      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Bad response'))))
        .then((json) => {
          const items: Suggestion[] = json.data ?? []
          if (cacheRef.current.size >= MAX_CACHE_ENTRIES) {
            const firstKey = cacheRef.current.keys().next().value
            if (firstKey !== undefined) cacheRef.current.delete(firstKey)
          }
          cacheRef.current.set(q, items)
          setSuggestions(items)
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') setSuggestions([])
        })
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const close = () => {
    setIsOpen(false)
    setHighlight(-1)
  }

  const goTo = (s: Suggestion) => {
    close()
    setQuery('')
    onNavigate?.()
    router.push(`/products/${s.slug}`)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = highlight >= 0 ? suggestions[highlight] : suggestions[0]
      if (target) goTo(target)
    } else if (e.key === 'Escape') {
      close()
    }
  }

  const showDropdown = isOpen && query.trim().length >= MIN_QUERY_LEN
  const defaultInputClass =
    'w-full pl-4 pr-10 py-2 rounded-lg border border-border focus:outline-hidden focus:ring-2 focus:ring-brand'

  return (
    <div ref={containerRef} className="relative w-full">
      <Search
        size={18}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
          setHighlight(-1)
        }}
        onFocus={() => {
          if (query.trim().length >= MIN_QUERY_LEN) setIsOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName ?? defaultInputClass}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="search-suggestions"
        role="combobox"
      />

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden max-h-[480px] overflow-y-auto"
        >
          {loading && suggestions.length === 0 && (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-2" size={16} />
              Searching...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="py-4 text-center text-muted-foreground text-sm">
              No products found for &ldquo;{query.trim()}&rdquo;
            </div>
          )}

          {suggestions.map((s, i) => (
            <button
              key={s.product_id}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault()
                goTo(s)
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                i === highlight ? 'bg-brand-tint' : 'hover:bg-muted'
              }`}
            >
              <div className="relative w-10 h-10 flex-shrink-0 rounded bg-muted overflow-hidden">
                <Image
                  src={getPublicImageUrl(s.image_url)}
                  alt={s.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">${s.final_price.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchBar
