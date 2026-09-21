import { languageHref, locale } from '../i18n'

export function LanguageSwitch() {
  return (
    <nav className="language-switch" aria-label={locale === 'en' ? 'Language' : 'Dil'}>
      {(['tr', 'en'] as const).map((language) => (
        <a
          key={language}
          href={languageHref(language)}
          lang={language}
          hrefLang={language}
          aria-current={language === locale ? 'page' : undefined}
        >
          {language.toUpperCase()}
        </a>
      ))}
    </nav>
  )
}
