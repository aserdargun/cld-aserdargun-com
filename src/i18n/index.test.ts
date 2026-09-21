import { afterEach, describe, expect, it, vi } from 'vitest'
import english from './en.json'

async function withLanguage(language: string) {
  window.history.replaceState({}, '', `/?lang=${language}`)
  vi.resetModules()
  return import('./index')
}

afterEach(() => {
  window.history.replaceState({}, '', '/')
  vi.resetModules()
})

describe('language entry and translations', () => {
  it('uses an explicit English entry and keeps Turkish as the default', async () => {
    const { localeFromSearch } = await withLanguage('en')
    expect(localeFromSearch('?lang=en')).toBe('en')
    expect(localeFromSearch('?lang=tr')).toBe('tr')
    expect(localeFromSearch('?lang=invalid')).toBe('tr')
    expect(localeFromSearch('')).toBe('tr')
  })

  it('translates labels and interpolations without losing surrounding spacing', async () => {
    const { t, tf, languageHref } = await withLanguage('en')
    expect(t(' sağlayıcı')).toBe(' providers')
    expect(tf('{0} GB depolama', [25])).toBe('25 GB storage')
    expect(tf('{0} ayrıntılarını {1}', ['Azure', t('göster')])).toBe('Show Azure details')
    window.history.replaceState({}, '', '/?lang=en&from=portfolio#ogren')
    expect(languageHref('tr')).toBe('/?lang=tr&from=portfolio#ogren')
  })

  it('preserves original Turkish text and all translation placeholders', async () => {
    const { t } = await withLanguage('tr')
    expect(t(' sağlayıcı')).toBe(' sağlayıcı')
    for (const [original, translation] of Object.entries(english)) {
      expect(translation.trim(), original).not.toBe('')
      expect(translation.match(/\{\d+\}/g)?.sort() ?? [], original).toEqual(
        original.match(/\{\d+\}/g)?.sort() ?? [],
      )
    }
  })

  it('localizes catalog descriptions while keeping pricing, identifiers and source evidence intact', async () => {
    await withLanguage('tr')
    const original = (await import('../data/catalog')).loadCatalog()
    const originalGlossary = (await import('../data/education')).glossary
    await withLanguage('en')
    const localized = (await import('../data/catalog')).loadCatalog()
    const localizedGlossary = (await import('../data/education')).glossary
    expect(localizedGlossary.map((entry) => entry.id)).toEqual(
      originalGlossary.map((entry) => entry.id),
    )
    expect(localizedGlossary[2]?.term).toBe('Egress (outbound traffic)')
    const dictionary: Readonly<Record<string, string>> = english
    const verify = (before: unknown, after: unknown, field = ''): void => {
      if (typeof before === 'string') {
        const machineField =
          /^(id|.*Ids?|.*At|date|url|officialSite|currency|unit|category|kind|region|owner|status|scope|countryCode)$/i.test(
            field,
          )
        if (machineField || !dictionary[before]) expect(after, field).toBe(before)
      } else if (Array.isArray(before)) {
        expect((after as unknown[]).length).toBe(before.length)
        before.forEach((value, index) => verify(value, (after as unknown[])[index], field))
      } else if (before && typeof before === 'object') {
        expect(Object.keys(after as object)).toEqual(Object.keys(before))
        Object.entries(before).forEach(([key, value]) =>
          verify(value, (after as Record<string, unknown>)[key], key),
        )
      } else expect(after, field).toEqual(before)
    }
    verify(original, localized)
    expect(original.scenarios[0]?.name).toBe('Küçük web uygulaması')
    expect(localized.scenarios[0]?.name).toBe('Small web application')
  })
})
