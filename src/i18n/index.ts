import english from './en.json'

export type Locale = 'tr' | 'en'
export function localeFromSearch(search: string): Locale {
  return new URLSearchParams(search).get('lang') === 'tr' ? 'tr' : 'en'
}
export const locale = localeFromSearch(typeof window === 'undefined' ? '' : window.location.search)
export const formatLocale = locale === 'en' ? 'en-US' : 'tr-TR'
const messages: Readonly<Record<string, string>> = english

export function t(text: string): string {
  if (locale === 'tr') return text
  const key = text.replace(/\s+/g, ' ').trim()
  const translated = messages[key]
  if (translated === undefined) return text
  return `${/^\s/.test(text) ? ' ' : ''}${translated}${/\s$/.test(text) ? ' ' : ''}`
}

export function tf(text: string, values: readonly unknown[]): string {
  return t(text).replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ''))
}

// Translate display strings in a derived copy; IDs, quantities, prices, dates,
// source URLs and the canonical JSON records are preserved.
export function localizedData<T>(value: T): T {
  if (locale === 'tr') return value
  if (typeof value === 'string') return t(value) as T
  if (Array.isArray(value)) return value.map(localizedData) as T
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, localizedData(entry)]),
    ) as T
  return value
}

export function languageHref(next: Locale): string {
  const url = new URL(window.location.href)
  url.searchParams.set('lang', next)
  return `${url.pathname}${url.search}${url.hash}`
}
