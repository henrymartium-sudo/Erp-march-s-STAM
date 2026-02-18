'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// --- Serialization helpers (handles Date objects) ---

function replacer(_key: string, value: unknown) {
  if (value instanceof Date) {
    return { __type: 'Date', iso: value.toISOString() }
  }
  return value
}

function reviver(_key: string, value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).__type === 'Date'
  ) {
    return new Date((value as Record<string, unknown>).iso as string)
  }
  return value
}

interface StoredDraft<T> {
  data: T
  savedAt: string
}

function serializeData<T>(data: T): string {
  return JSON.stringify(data, replacer)
}

function serializeForStorage<T>(data: T): string {
  const stored: StoredDraft<T> = { data, savedAt: new Date().toISOString() }
  return JSON.stringify(stored, replacer)
}

function deserializeFromStorage<T>(raw: string): StoredDraft<T> | null {
  try {
    return JSON.parse(raw, reviver) as StoredDraft<T>
  } catch {
    return null
  }
}

/**
 * Load a previously saved draft from localStorage.
 * Returns null if no draft exists or on error.
 * Only runs on the client (returns null on SSR).
 */
export function loadDraft<T>(key: string): { data: T; savedAt: Date } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = deserializeFromStorage<T>(raw)
    if (!parsed) return null
    return { data: parsed.data, savedAt: new Date(parsed.savedAt) }
  } catch {
    return null
  }
}

/**
 * Format a relative time string in French.
 */
export function formatDraftAge(savedAt: Date): string {
  const mins = Math.floor((Date.now() - savedAt.getTime()) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  return `il y a ${Math.floor(mins / 60)}h`
}

/**
 * Hook to automatically save form data to localStorage with debounce.
 *
 * @param key     - localStorage key (e.g. 'draft:marche:new')
 * @param data    - current form values to persist
 * @param delay   - debounce delay in ms (default: 2000)
 * @param enabled - set to false to disable saving (e.g. in edit mode)
 */
export function useDraftSave<T>(
  key: string,
  data: T,
  delay = 2000,
  enabled = true
): {
  savedAt: Date | null
  clearDraft: () => void
  hasDraft: boolean
} {
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return !!localStorage.getItem(key)
    } catch {
      return false
    }
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevDataRef = useRef<string>('')
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip first render to avoid overwriting a just-restored draft
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!enabled) return

    const serialized = serializeData(data)

    // Skip if data hasn't actually changed
    if (serialized === prevDataRef.current) return
    prevDataRef.current = serialized

    // Clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current)

    // Schedule save after delay
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, serializeForStorage(data))
        setSavedAt(new Date())
        setHasDraft(true)
      } catch {
        // Ignore localStorage errors (quota exceeded, unavailable, etc.)
      }
    }, delay)
  }, [data, key, delay, enabled])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      localStorage.removeItem(key)
    } catch {}
    setSavedAt(null)
    setHasDraft(false)
    prevDataRef.current = ''
  }, [key])

  return { savedAt, clearDraft, hasDraft }
}
