import { Menu } from 'lucide-react'
import { useRef } from 'react'

interface HeroProps {
  verifiedAt: string
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const navigationItems = [
  { href: '#senaryolar', label: 'Senaryolar' },
  { href: '#karsilastirma', label: 'Karşılaştırma' },
  { href: '#ucretsiz-katmanlar', label: 'Ücretsiz katmanlar' },
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

export function Hero({ verifiedAt }: HeroProps) {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null)
  const formattedDate = dateFormatter.format(new Date(`${verifiedAt}T00:00:00.000Z`))
  const closeMobileMenu = () => mobileMenuRef.current?.removeAttribute('open')

  return (
    <div className="hero-shell">
      <header className="site-header">
        <a className="site-header__brand" href="#genel-bakis" aria-label="CLD ana sayfa">CLD</a>
        <nav className="site-header__navigation" aria-label="Ana navigasyon">
          <NavigationLinks />
        </nav>
        <a className="site-header__sources" href="#metodoloji">Kaynakları incele</a>

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
        <h1 id="hero-heading">Bulut maliyetlerini karşılaştır</h1>
        <p>Türkiye’den satın alınabilen servisler için kaynaklı USD analizi.</p>
        <p className="hero__verified">
          Son doğrulama: <time dateTime={verifiedAt}>{formattedDate}</time>
        </p>
      </section>
    </div>
  )
}
