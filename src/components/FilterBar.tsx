import { loadCatalog } from '../data/catalog'
import type { ComparisonState } from '../app/useComparisonState'
import type { Provider, ServiceCategory } from '../domain/catalog'
import './FilterBar.css'

const categoryLabels: Record<ServiceCategory, string> = {
  compute: 'Hesaplama',
  'gpu-ai': 'AI / GPU',
  'object-storage': 'Nesne depolama',
  'managed-database': 'Yönetilen veritabanı',
  serverless: 'Sunucusuz',
  'cdn-network': 'CDN / ağ',
  kubernetes: 'Kubernetes',
}

interface FilterBarProps {
  state: Pick<
    ComparisonState,
    | 'selectedProviderIds'
    | 'selectedCategories'
    | 'freeOnly'
    | 'includeStale'
    | 'toggleProvider'
    | 'toggleCategory'
    | 'setFreeOnly'
    | 'setIncludeStale'
  >
  providers?: readonly Provider[]
}

export function FilterBar({ state, providers: providedProviders }: FilterBarProps) {
  const providers = providedProviders ?? loadCatalog().providers
  return (
    <section className="filter-bar" role="region" aria-label="Karşılaştırma filtreleri">
      <fieldset className="filter-bar__group">
        <legend>Sağlayıcılar</legend>
        <div className="filter-bar__choices">
          {providers.map((provider) => (
            <button
              className="filter-bar__button"
              key={provider.id}
              type="button"
              aria-pressed={state.selectedProviderIds.has(provider.id)}
              onClick={() => state.toggleProvider(provider.id)}
            >
              {provider.shortName}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-bar__group">
        <legend>Hizmet kategorileri</legend>
        <div className="filter-bar__choices">
          {Object.entries(categoryLabels).map(([id, label]) => {
            const category = id as ServiceCategory
            return (
              <button
                className="filter-bar__button"
                key={category}
                type="button"
                aria-pressed={state.selectedCategories.has(category)}
                onClick={() => state.toggleCategory(category)}
              >
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="filter-bar__group filter-bar__toggles">
        <legend>Tablo filtreleri</legend>
        <label>
          <input
            type="checkbox"
            checked={state.freeOnly}
            onChange={(event) => state.setFreeOnly(event.target.checked)}
          />
          Yalnızca ücretsiz katmanlar
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.includeStale}
            onChange={(event) => state.setIncludeStale(event.target.checked)}
          />
          Eski verileri dahil et
        </label>
      </fieldset>
    </section>
  )
}
