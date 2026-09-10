import { getCatalogHealth, getUsableExchangeRates, loadCatalog } from '../data/catalog'
import type { Catalog, Offer, ProviderId } from '../domain/catalog'
import { getCatalogStats, rankEvidenceEligibleEstimates } from '../domain/presentation'
import { estimateProvider } from '../domain/ranking'
import { ComparisonTable } from '../components/ComparisonTable'
import { DecisionSummary } from '../components/DecisionSummary'
import { Education } from '../components/Education'
import { FilterBar } from '../components/FilterBar'
import { FreeTierGuide } from '../components/FreeTierGuide'
import { Hero } from '../components/Hero'
import { Methodology } from '../components/Methodology'
import { OfferExplorer } from '../components/OfferExplorer'
import { ProviderCompare } from '../components/ProviderCompare'
import { ProviderDetails } from '../components/ProviderDetails'
import { ScenarioCalculator } from '../components/ScenarioCalculator'
import { providerRegionKey, useComparisonState } from './useComparisonState'

interface AppProps {
  loadCatalogData?: () => Catalog
  today?: Date
}

function tryLoadCatalog(loader: () => Catalog): Catalog | null {
  try {
    return loader()
  } catch {
    return null
  }
}

function Dashboard({ catalog, today }: { catalog: Catalog; today: Date }) {
  const state = useComparisonState(catalog.scenarios, catalog.providers)
  const health = getCatalogHealth(catalog, today)
  const stats = getCatalogStats(catalog)
  const usableExchangeRates = getUsableExchangeRates(catalog, health)
  const eligibleFreeTierIds: readonly string[] = []

  const eligibleByStatus = (offer: Offer) => {
    const status = health.statusByOfferId[offer.id] ?? 'invalid'
    return status === 'current' || (state.includeStale && status === 'stale')
  }

  const rankingOffers = catalog.offers.filter(
    (offer) => (
      state.selectedProviderIds.has(offer.providerId) &&
      state.selectedRegionKeys.has(providerRegionKey(offer.providerId, offer.region)) &&
      eligibleByStatus(offer)
    ),
  )
  const pricingContext = {
    exchangeRates: usableExchangeRates,
    freeTiers: catalog.freeTiers,
    eligibleFreeTierIds,
    statusByOfferId: health.statusByOfferId,
    statusByFreeTierId: health.statusByFreeTierId,
    statusByExchangeRateId: health.statusByExchangeRateId,
  }
  const providerEstimates = [...state.selectedProviderIds].map((providerId: ProviderId) => (
    estimateProvider(providerId, rankingOffers, state.scenario, pricingContext)
  ))
  const estimateEvidenceContext = {
    exchangeRates: catalog.exchangeRates,
    sources: catalog.sources,
    statusByExchangeRateId: health.statusByExchangeRateId,
  }
  const estimates = rankEvidenceEligibleEstimates(
    providerEstimates,
    catalog.providers,
    estimateEvidenceContext,
  )

  const detailedOffers = catalog.offers.filter((offer) => {
    if (!state.selectedProviderIds.has(offer.providerId)) return false
    if (!state.selectedRegionKeys.has(providerRegionKey(offer.providerId, offer.region))) return false
    if (!state.selectedCategories.has(offer.category)) return false
    if (!eligibleByStatus(offer)) return false
    if (!state.freeOnly) return true
    return catalog.freeTiers.some((freeTier) => (
      freeTier.compatibleOfferIds.includes(offer.id) &&
      (health.statusByFreeTierId[freeTier.id] ?? 'invalid') !== 'invalid'
    ))
  })

  return (
    <div className="app-shell">
      <Hero stats={stats} />

      <main className="app-main">
        {health.staleCount > 0 ? (
          <p className="catalog-notice" role="status">
            {health.staleCount} teklif veya ücretsiz katman kaydı 30 günden eski.
            {' '}Bu kayıtlar güncel fiyat sıralamasına alınmaz. Satın almadan önce resmî kaynakları yeniden kontrol edin.
          </p>
        ) : null}
        <section className="scenario-workspace" id="senaryolar" aria-label="Senaryolar">
          <div className="scenario-workspace__grid">
            <ScenarioCalculator state={state} scenarios={catalog.scenarios} />
            <DecisionSummary
              estimates={estimates}
              providers={catalog.providers}
              exchangeRates={catalog.exchangeRates}
              sources={catalog.sources}
              statusByExchangeRateId={health.statusByExchangeRateId}
            />
          </div>
        </section>

        <ProviderCompare
          estimates={estimates}
          providers={catalog.providers}
          exchangeRates={catalog.exchangeRates}
          sources={catalog.sources}
          statusByExchangeRateId={health.statusByExchangeRateId}
        />

        <OfferExplorer
          offers={detailedOffers}
          filterBar={<FilterBar state={state} providers={catalog.providers} />}
          comparisonTable={(
            <ComparisonTable
              offers={detailedOffers}
              providers={catalog.providers}
              sources={catalog.sources}
              freeTiers={catalog.freeTiers}
              exchangeRates={catalog.exchangeRates}
              health={health}
              scenario={state.scenario}
              eligibleFreeTierIds={eligibleFreeTierIds}
            />
          )}
        />

        <Education />

        <FreeTierGuide
          freeTiers={catalog.freeTiers}
          providers={catalog.providers}
          sources={catalog.sources}
          health={health}
        />

        <ProviderDetails providers={catalog.providers} sources={catalog.sources} />
        <Methodology />
      </main>

      <footer className="site-footer">
        <div>
          <strong>CLD</strong>
          <span aria-hidden="true">{' · '}</span>
          <span>Kaynaklı bulut maliyet karşılaştırması</span>
        </div>
        <a href="#genel-bakis">Başa dön</a>
      </footer>
    </div>
  )
}

export function App({ loadCatalogData = loadCatalog, today = new Date() }: AppProps) {
  const catalog = tryLoadCatalog(loadCatalogData)

  if (catalog === null) {
    return (
      <main className="catalog-error">
        <p role="alert">Fiyat kataloğu doğrulanamadı. Kaynak verileri kontrol edin.</p>
      </main>
    )
  }

  return <Dashboard catalog={catalog} today={today} />
}
