import { useCallback, useEffect, useState } from 'react'

/**
 * `localStorage` üzerinde tip-güvenli durum yönetimi.
 *
 * - İlk render'da `window` mevcutsa `localStorage`'dan okunur; SSR sırasında
 *   `defaultValue` kullanılır.
 * - Yazma sırasında JSON serileştirme hataları yakalanır; uygulama çökmez.
 * - Aynı `key` ile birden çok bileşen kullanılırsa `storage` olayı ile
 *   senkronize kalır.
 * - `serializer` / `deserializer` ilk render'dan sonra değişirse en son değer
 *   bir sonraki olay/yazma için kullanılır.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: { serializer?: (value: T) => string; deserializer?: (raw: string) => T } = {},
): readonly [T, (value: T | ((previous: T) => T)) => void, () => void] {
  const serializer = options.serializer ?? JSON.stringify
  const deserializer = options.deserializer ?? JSON.parse

  // Lazy initializer: ilk render'da bir kez localStorage'a bakar; SSR'da defaultValue.
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return defaultValue
      return deserializer(raw) as T
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return
      if (event.key !== null && event.key !== key) return
      try {
        if (event.newValue === null) {
          setValue(defaultValue)
        } else {
          setValue(deserializer(event.newValue) as T)
        }
      } catch {
        // Bozuk payload: sessizce varsayılana dön.
        setValue(defaultValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, defaultValue, deserializer])

  const updateValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, serializer(resolved))
          } catch {
 // Kota veya gizli mod: yazma başarısız olsa bile UI güncellenir.
          }
        }
        return resolved
      })
    },
    [key, serializer],
  )

  const reset = useCallback(() => {
    setValue(defaultValue)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // yoksay
      }
    }
  }, [key, defaultValue])

  return [value, updateValue, reset] as const
}
