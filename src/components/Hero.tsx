import { Menu } from 'lucide-react'
import { useRef } from 'react'
import type { CatalogStats } from '../domain/presentation'
import { ThemeToggle } from './ThemeToggle'

interface HeroProps {
  stats: CatalogStats
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const navigationItems = [
  { href: '#senaryolar', label: 'Hesapla' },
  { href: '#sonuclar', label: 'Sonuçlar' },
  { href: '#karsilastirma', label: 'Teklifler' },
  { href: '#ogren', label: 'Öğren' },
  { href: '#ucretsiz-katmanlar', label: 'Ücretsiz kullanım' },
  { href: '#metodoloji', label: 'Metodoloji' },
] as const

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navigationItems.map((item) => (
        <a key={item.href} href={item.href} onClick={onNavigate}>{item.label}</a>
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
        <a className="site-header__brand" href="#genel-bakis" aria-label="CLD ana sayfa">CLD</a>
        <nav className="site-header__navigation" aria-label="Ana navigasyon">
          <NavigationLinks />
        </nav>
        <div className="site-header__actions">
          <a className="site-header__sources" href="#metodoloji">Kaynakları incele</a>
          <ThemeToggle />
        </div>

        <details className="site-header__mobile-menu" ref={mobileMenuRef}>
          <summary aria-label="Menüyü aç">
            <Menu aria-hidden="true" size={28} strokeWidth={2} />
          </summary>
          <nav aria-label="Mobil navigasyon">
            <NavigationLinks onNavigate={closeMobileMenu} />
            <a href="#metodoloji" onClick={closeMobileMenu}>Kaynakları incele</a>
          </nav>
        </details>
      </header>

      <section className="hero" id="genel-bakis" aria-labelledby="hero-heading">
        <p className="hero__eyebrow">Kaynaklı bulut maliyet karşılaştırması</p>
        <h1 id="hero-heading">Bulut maliyetini senaryona göre karşılaştır</h1>
        <p className="hero__lede">
          Türkiye’den erişilebilen servisler için kaynaklı, vergiler hariç liste fiyatı analizi.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#senaryolar">Hesaplamaya başla</a>
          <a className="button button--ghost" href="#metodoloji">Yöntemi ve kaynakları incele</a>
        </div>
        <dl className="hero__trust" aria-label="Katalog güven özeti">
          <div>
            <dt>Son doğrulama</dt>
            <dd><time dateTime={stats.latestVerificationDate}>{formattedDate}</time></dd>
          </div>
          <div>
            <dt>Kapsam</dt>
            <dd>{stats.providerCount} sağlayıcı</dd>
          </div>
          <div>
            <dt>Fiyat kataloğu</dt>
            <dd>{stats.offerCount} teklif</dd>
          </div>
          <div>
            <dt>Kanıt</dt>
            <dd>{stats.sourceCount} resmî kaynak</dd>
          </div>
        </dl>
        <p className="hero__basis">Genel liste fiyatı · Vergiler hariç · USD</p>
      </section>
    </div>
  )
}
