import { formatLocale, t } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'
import { Menu } from 'lucide-react'
import { useRef } from 'react'
import type { CatalogStats } from '../domain/presentation'
import { ThemeToggle } from './ThemeToggle'

interface HeroProps {
  stats: CatalogStats
}

const dateFormatter = new Intl.DateTimeFormat(formatLocale, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const navigationItems = [
  { href: '#senaryolar', label: t('Hesapla') },
  { href: '#sonuclar', label: t('Sonuçlar') },
  { href: '#karsilastirma', label: t('Teklifler') },
  { href: '#ogren', label: t('Öğren') },
  { href: '#ucretsiz-katmanlar', label: t('Ücretsiz kullanım') },
  { href: '#metodoloji', label: t('Metodoloji') },
] as const

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navigationItems.map((item) => (
        <a key={item.href} href={item.href} onClick={onNavigate}>
          {item.label}
        </a>
      ))}
    </>
  )
}

export function Hero({ stats }: HeroProps) {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null)
  const formattedDate = dateFormatter.format(
    new Date(`${stats.latestVerificationDate}T00:00:00.000Z`),
  )
  const closeMobileMenu = () => mobileMenuRef.current?.removeAttribute('open')

  return (
    <div className="hero-shell">
      <header className="site-header">
        <a className="site-header__brand" href="#genel-bakis" aria-label={t('CLD ana sayfa')}>
          CLD
        </a>
        <nav className="site-header__navigation" aria-label={t('Ana navigasyon')}>
          <NavigationLinks />
        </nav>
        <div className="site-header__actions">
          <a className="site-header__sources" href="#metodoloji">
            {t('Kaynakları incele')}
          </a>
          <LanguageSwitch />
          <ThemeToggle />
        </div>

        <details className="site-header__mobile-menu" ref={mobileMenuRef}>
          <summary aria-label={t('Menüyü aç')}>
            <Menu aria-hidden="true" size={28} strokeWidth={2} />
          </summary>
          <nav aria-label={t('Mobil navigasyon')}>
            <NavigationLinks onNavigate={closeMobileMenu} />
            <a href="#metodoloji" onClick={closeMobileMenu}>
              {t('Kaynakları incele')}
            </a>
          </nav>
        </details>
      </header>

      <section className="hero" id="genel-bakis" aria-labelledby="hero-heading">
        <p className="hero__eyebrow">{t('Kaynaklı bulut maliyet karşılaştırması')}</p>
        <h1 id="hero-heading">{t('Bulut maliyetini senaryona göre karşılaştır')}</h1>
        <p className="hero__lede">
          {t(
            'Türkiye’den erişilebilen servisler için kaynaklı, vergiler hariç liste fiyatı analizi.',
          )}
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#senaryolar">
            {t('Hesaplamaya başla')}
          </a>
          <a className="button button--ghost" href="#metodoloji">
            {t('Yöntemi ve kaynakları incele')}
          </a>
        </div>
        <dl className="hero__trust" aria-label={t('Katalog güven özeti')}>
          <div>
            <dt>{t('En son kayıt doğrulaması')}</dt>
            <dd>
              <time dateTime={stats.latestVerificationDate}>{formattedDate}</time>
            </dd>
          </div>
          <div>
            <dt>{t('Kapsam')}</dt>
            <dd>
              {stats.providerCount}
              {t(' sağlayıcı')}
            </dd>
          </div>
          <div>
            <dt>{t('Fiyat kataloğu')}</dt>
            <dd>
              {stats.offerCount}
              {t(' teklif')}
            </dd>
          </div>
          <div>
            <dt>{t('Kanıt')}</dt>
            <dd>
              {stats.sourceCount}
              {t(' resmî kaynak')}
            </dd>
          </div>
        </dl>
        <p className="hero__basis">{t('Genel liste fiyatı · Vergiler hariç · USD')}</p>
        <p className="hero__basis">
          {t(
            'Her kaydın tarihi ayrıdır; en son tarih tüm kataloğun güncel olduğu anlamına gelmez.',
          )}
        </p>
      </section>
    </div>
  )
}
