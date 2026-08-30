import { useState } from 'react'
import type {
  ExchangeRate,
  PriceKind,
  Provider,
  ProviderId,
  PurchaseAvailability,
  Source,
  VerificationStatus,
} from '../domain/catalog'
import {
  assessEstimateEvidence,
  dominantCostKind,
  isEstimateEvidenceEligible,
  type EligibleEstimateEvidence,
  type ProviderRegion,
} from '../domain/presentation'
import type { RankedProviderEstimate } from '../domain/ranking'
import { ProviderMark } from './ProviderMark'
import { StatusBadge } from './StatusBadge'
import './ProviderCompare.css'

const priceKindLabels: Record<PriceKind, string> = {
  'instance-hour': 'Çalışma süresi',
  'flat-month': 'Sabit aylık ücret',
  'storage-gb-month': 'Depolama',
  'outbound-gb': 'Dış trafik',
  'requests-million': 'İstekler',
  'database-gb-month': 'Veritabanı',
  'gpu-hour': 'GPU kullanımı',
}

const availabilityLabels: Record<PurchaseAvailability, string> = {
  verified: 'Doğrulandı; hesap ve ödeme kontrolleri uygulanabilir',
  conditional: 'Koşullu; ülke, ödeme yöntemi ve hesap doğrulamasına bağlıdır',
  unverified: 'Doğrulanamadı; satın alma uygunluğu garanti edilmez',
}

const monthlyUsdFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatMonthlyUsd(value: number | null): string {
  return value === null ? 'Doğrulanamadı' : `${monthlyUsdFormatter.format(value)} USD/ay`
}

function formatRegion(region: ProviderRegion): string {
  return `${region.name} · ${region.scope === 'global' ? 'Global' : region.countryCode}`
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`))
}

function notesFor(estimate: RankedProviderEstimate, provider: Provider): string {
  const notes = [
    ...provider.limitations,
    ...estimate.lineItems.flatMap((lineItem) => lineItem.offer.notes),
  ]
  return [...new Set(notes)].join(' · ') || 'Doğrulanamadı'
}

interface ProviderCompareProps {
  estimates: readonly RankedProviderEstimate[]
  providers: readonly Provider[]
  exchangeRates: readonly ExchangeRate[]
  sources: readonly Source[]
  statusByExchangeRateId: Readonly<Record<string, VerificationStatus>>
}

interface ProviderCompareSelectionProps {
  comparable: readonly EligibleEstimateEvidence<RankedProviderEstimate>[]
}

function ProviderCompareSelection({ comparable }: ProviderCompareSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<ProviderId>>(
    () => new Set(comparable.slice(0, 3).map(({ estimate }) => estimate.providerId)),
  )

  function toggleProvider(providerId: ProviderId) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(providerId) && next.size > 1) next.delete(providerId)
      else if (next.size < 4) next.add(providerId)
      return next
    })
  }

  const selectedEstimates = comparable.filter(({ estimate }) => (
    selectedIds.has(estimate.providerId)
  ))
  const selectionLimitReached = selectedIds.size >= 4

  return (
    <>
      <div className="provider-compare__selector" aria-label="Karşılaştırılacak sağlayıcılar">
        {comparable.map(({ provider }) => {
          const selected = selectedIds.has(provider.id)

          return (
            <button
              type="button"
              key={provider.id}
              aria-pressed={selected}
              disabled={!selected && selectionLimitReached}
              onClick={() => toggleProvider(provider.id)}
            >
              {provider.shortName}
            </button>
          )
        })}
      </div>

      {selectionLimitReached ? (
        <p className="provider-compare__limit">En fazla 4 sağlayıcı seçebilirsiniz</p>
      ) : null}

      {selectedEstimates.length === 0 ? (
        <p className="provider-compare__empty">Karşılaştırmak için en az bir sağlayıcı seçin.</p>
      ) : (
        <div className="provider-compare__cards">
          {selectedEstimates.map((evidence) => {
            const { estimate, provider, regionSignal, latestVerificationDate } = evidence
            const dominantKind = dominantCostKind(estimate)

            return (
              <article className="provider-compare__card" key={provider.id} aria-label={provider.name}>
                <header className="provider-compare__card-head">
                  <div className="provider-compare__identity">
                    <span className="provider-compare__mark" aria-hidden="true">
                      <ProviderMark providerId={provider.id} />
                    </span>
                    <strong>{provider.name}</strong>
                  </div>
                  <StatusBadge status={estimate.status} />
                </header>

                <output className="provider-compare__total" aria-label="Aylık toplam">
                  {formatMonthlyUsd(estimate.totalUsd)}
                </output>
                <p className="provider-compare__basis">Vergiler hariç</p>

                <dl className="provider-compare__facts">
                  <div>
                    <dt>En büyük maliyet kalemi</dt>
                    <dd>{dominantKind === null ? 'Doğrulanamadı' : priceKindLabels[dominantKind]}</dd>
                  </div>
                  <div>
                    <dt>Bölgeler</dt>
                    <dd>{regionSignal.regions.map(formatRegion).join(' · ')}</dd>
                  </div>
                  <div>
                    <dt>Kapsam</dt>
                    <dd>Eksiksiz</dd>
                  </div>
                  <div>
                    <dt>Ücretsiz katman</dt>
                    <dd>Bilgi amaçlı; tahmine uygulanmadı</dd>
                  </div>
                  <div>
                    <dt>Türkiye’den satın alma</dt>
                    <dd>{availabilityLabels[provider.purchaseAvailability]}</dd>
                  </div>
                  <div>
                    <dt>Kritik notlar / hariçler</dt>
                    <dd>{notesFor(estimate, provider)}</dd>
                  </div>
                  <div>
                    <dt>Son doğrulama</dt>
                    <dd>
                      <time dateTime={latestVerificationDate}>
                        {formatDate(latestVerificationDate)}
                      </time>
                      {' · '}
                      <StatusBadge status={estimate.status} />
                    </dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

export function ProviderCompare({
  estimates,
  providers,
  exchangeRates,
  sources,
  statusByExchangeRateId,
}: ProviderCompareProps) {
  const comparable = estimates
    .map((estimate) => assessEstimateEvidence(estimate, providers, {
      exchangeRates,
      sources,
      statusByExchangeRateId,
    }))
    .filter(isEstimateEvidenceEligible)
  const comparableSignature = comparable
    .map(({ estimate }) => estimate.providerId)
    .join('|')

  return (
    <section className="provider-compare page-section" id="saglayici-karsilastirma" aria-label="Sağlayıcıları karşılaştır">
      <header className="provider-compare__heading">
        <div>
          <span>Yan yana inceleme</span>
          <h2>Sağlayıcıları karşılaştır</h2>
        </div>
        <p><strong>Genel liste fiyatı</strong> · Vergiler hariç; yalnızca güncel ve eksiksiz tahminler karşılaştırılır.</p>
      </header>

      <ProviderCompareSelection
        key={comparableSignature}
        comparable={comparable}
      />
    </section>
  )
}
