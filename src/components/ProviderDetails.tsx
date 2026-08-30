import { ChevronDown, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type {
  Provider,
  ProviderId,
  PurchaseAvailability,
  Source,
} from '../domain/catalog'
import { ProviderMark } from './ProviderMark'
import { SourceLink } from './SourceLink'

interface ProviderDetailsProps {
  providers: readonly Provider[]
  sources: readonly Source[]
}

const availabilityLabels: Record<PurchaseAvailability, string> = {
  verified: 'Doğrulandı; hesap ve ödeme kontrolleri uygulanabilir',
  conditional: 'Koşullu; ülke, ödeme yöntemi ve hesap doğrulamasına bağlıdır',
  unverified: 'Doğrulanamadı; satın alma uygunluğu garanti edilmez',
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00.000Z`))
}

export function ProviderDetails({ providers, sources }: ProviderDetailsProps) {
  const [openProviderId, setOpenProviderId] = useState<ProviderId | null>(null)

  return (
    <section
      className="provider-details page-section"
      id="saglayici-ayrintilari"
      aria-labelledby="provider-details-heading"
    >
      <header className="page-section__heading">
        <h2 id="provider-details-heading">Sağlayıcı ayrıntıları</h2>
        <p>
          Bölge, ödeme ve satın alma bilgileri araştırma tarihindeki resmî kaynaklara dayanır.
        </p>
      </header>

      <ul className="provider-details__list">
        {providers.map((provider) => {
          const isOpen = openProviderId === provider.id
          const bodyId = `provider-details-body-${provider.id}`

          return (
            <li
              className={`provider-details__row provider-details__row--${provider.id}`}
              key={provider.id}
              aria-label={provider.name}
            >
              <header className="provider-details__identity">
                <div>
                  <ProviderMark providerId={provider.id} size={22} />
                  <h3>{provider.name}</h3>
                </div>
                <button
                  className="provider-details__toggle"
                  type="button"
                  aria-controls={bodyId}
                  aria-expanded={isOpen}
                  aria-label={`${provider.name} ayrıntılarını ${isOpen ? 'gizle' : 'göster'}`}
                  onClick={() => setOpenProviderId(isOpen ? null : provider.id)}
                >
                  <span aria-hidden="true">Ayrıntılar</span>
                  <ChevronDown aria-hidden="true" size={18} strokeWidth={1.9} />
                </button>
              </header>

              <div className="provider-details__panel" id={bodyId} hidden={!isOpen}>
                {isOpen && (
                  <div className="provider-details__body">
                    <a
                      className="provider-details__official"
                      href={provider.officialSite}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${provider.name} resmî sitesi`}
                    >
                      Resmî site
                      <ExternalLink aria-hidden="true" size={15} strokeWidth={1.9} />
                    </a>

                    <div className="provider-details__facts">
                      <section>
                        <h4>Güçlü yönler</h4>
                        <ul>
                          {provider.strengths.map((strength) => <li key={strength}>{strength}</li>)}
                        </ul>
                      </section>
                      <section>
                        <h4>Sınırlamalar</h4>
                        <ul>
                          {provider.limitations.map((limitation) => (
                            <li key={limitation}>{limitation}</li>
                          ))}
                        </ul>
                      </section>
                      <section>
                        <h4>Avrupa / global bölgeler</h4>
                        <ul>
                          {provider.regions.map((region) => (
                            <li key={region.id}>
                              {region.name}
                              {region.countryCode ? ` · ${region.countryCode}` : ' · global'}
                            </li>
                          ))}
                        </ul>
                      </section>
                      <section>
                        <h4>Türkiye’den satın alma</h4>
                        <strong
                          className={`provider-details__availability provider-details__availability--${provider.purchaseAvailability}`}
                        >
                          {availabilityLabels[provider.purchaseAvailability]}
                        </strong>
                        <p>{provider.purchaseNote}</p>
                        <span className="provider-details__verified">
                          Doğrulama:{' '}
                          <time dateTime={provider.verifiedAt}>{formatDate(provider.verifiedAt)}</time>
                        </span>
                      </section>
                    </div>

                    <div className="provider-details__sources">
                      <section>
                        <h4>Satın alma kaynakları</h4>
                        {provider.purchaseSourceIds.map((sourceId) => (
                          <SourceLink key={sourceId} sourceId={sourceId} sources={sources} />
                        ))}
                      </section>
                      <section>
                        <h4>Bölge kaynakları</h4>
                        {[...new Set(provider.regions.map((region) => region.sourceId))].map(
                          (sourceId) => (
                            <SourceLink key={sourceId} sourceId={sourceId} sources={sources} />
                          ),
                        )}
                      </section>
                    </div>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
