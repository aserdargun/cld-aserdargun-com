import { getCatalogHealth, loadCatalog } from '../data/catalog'
import type { Catalog, Offer, ProviderId } from '../domain/catalog'
import { estimateProvider, rankProviderEstimates } from '../domain/ranking'
import { ComparisonTable } from '../components/ComparisonTable'
import { FilterBar } from '../components/FilterBar'
import { FreeTierTable } from '../components/FreeTierTable'
import { Hero } from '../components/Hero'
import { Methodology } from '../components/Methodology'
import { ProviderDetails } from '../components/ProviderDetails'
import { ScenarioCalculator } from '../components/ScenarioCalculator'
import { ScenarioSummary } from '../components/ScenarioSummary'
import { useComparisonState } from './useComparisonState'

interface AppProps {
  loadCatalogData?: () => Catalog
  today?: Date
}

function latestVerificationDate(catalog: Catalog): string {
  const dates = [
    ...catalog.providers.map((provider) => provider.verifiedAt),
    ...catalog.offers.map((offer) => offer.verifiedAt),
    ...catalog.freeTiers.map((freeTier) => freeTier.verifiedAt),
  ]
  return dates.reduce((latest, date) => date > latest ? date : latest, dates[0] ?? '')
}

function tryLoadCatalog(loader: () => Catalog): Catalog | null {
  try {
    return loader()
  } catch {
    return null
  }
}

function Dashboard({ catalog, today }: { catalog: Catalog; today: Date }) {
  const state = useComparisonState(catalog.scenarios)
  const health = getCatalogHealth(catalog, today)
  const eligibleFreeTierIds: readonly string[] = []

  const eligibleByStatus = (offer: Offer) => {
    const status = health.statusByOfferId[offer.id] ?? 'invalid'
    return status === 'current' || (state.includeStale && status === 'stale')
  }

  const rankingOffers = catalog.offers.filter(
    (offer) => state.selectedProviderIds.has(offer.providerId) && eligibleByStatus(offer),
  )
  const pricingContext = {
    exchangeRates: catalog.exchangeRates,
    freeTiers: catalog.freeTiers,
    eligibleFreeTierIds,
    statusByOfferId: health.statusByOfferId,
    statusByFreeTierId: health.statusByFreeTierId,
  }
  const estimates = rankProviderEstimates(
    [...state.selectedProviderIds].map((providerId: ProviderId) => (
      estimateProvider(providerId, rankingOffers, state.scenario, pricingContext)
    )),
  )

  const detailedOffers = catalog.offers.filter((offer) => {
    if (!state.selectedProviderIds.has(offer.providerId)) return false
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
      <Hero verifiedAt={latestVerificationDate(catalog)} />

      <main className="app-main">
        <section className="scenario-workspace" id="senaryolar" aria-label="Senaryolar">
          <div className="scenario-workspace__grid">
            <ScenarioCalculator state={state} scenarios={catalog.scenarios} />
            <ScenarioSummary estimates={estimates} providers={catalog.providers} />
          </div>
        </section>

        <section className="comparison-section page-section" id="karsilastirma" aria-labelledby="comparison-heading">
          <header className="page-section__heading">
            <h2 id="comparison-heading">Servis karşılaştırması</h2>
          </header>
          <FilterBar state={state} providers={catalog.providers} />
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
        </section>

        <section className="free-tier-section page-section" id="ucretsiz-katmanlar" aria-labelledby="free-tier-heading">
          <header className="page-section__heading">
            <h2 id="free-tier-heading">Ücretsiz kullanım imkânları</h2>
            <p>Krediler, süreli teklifler ve sürekli kotalar birbirinden ayrı gösterilir.</p>
          </header>
          <FreeTierTable
            freeTiers={catalog.freeTiers}
            providers={catalog.providers}
            sources={catalog.sources}
            health={health}
          />
        </section>

        <ProviderDetails providers={catalog.providers} sources={catalog.sources} />
        <Methodology />
      </main>

      <footer className="site-footer">
        <div>
          <strong>CLD</strong>
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
