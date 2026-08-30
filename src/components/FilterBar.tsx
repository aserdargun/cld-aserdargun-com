import { useState } from 'react'
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
    | 'selectedRegionKeys'
    | 'scenario'
    | 'freeOnly'
    | 'includeStale'
    | 'toggleProvider'
    | 'toggleCategory'
    | 'toggleRegion'
    | 'setFreeOnly'
    | 'setIncludeStale'
    | 'clearOfferFilters'
    | 'resetOfferFiltersForScenario'
  >
  providers?: readonly Provider[]
}

export function FilterBar({ state, providers: providedProviders }: FilterBarProps) {
  const providers = providedProviders ?? loadCatalog().providers
  const [open, setOpen] = useState(false)
  const providerIdSet = new Set(providers.map((provider) => provider.id))
  const scenarioCategorySet = new Set(state.scenario.requiredCategories)
  const regionKeySet = new Set(providers.flatMap((provider) => (
    provider.regions.map((region) => `${provider.id}:${region.id}`)
  )))
  const selectedDifferenceCount = <T,>(selected: Set<T>, expected: Set<T>) => (
    [...selected].filter((value) => !expected.has(value)).length +
    [...expected].filter((value) => !selected.has(value)).length
  )
  const activeFilterCount = selectedDifferenceCount(state.selectedProviderIds, providerIdSet) +
    selectedDifferenceCount(state.selectedCategories, scenarioCategorySet) +
    selectedDifferenceCount(state.selectedRegionKeys, regionKeySet) +
    Number(state.freeOnly) + Number(state.includeStale)

  return (
    <section className="filter-bar" role="region" aria-label="Karşılaştırma filtreleri">
      <button
        className="filter-bar__summary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Filtreler · {activeFilterCount}
      </button>

      {open ? <div className="filter-bar__panel">
        <div className="filter-bar__actions">
          <button type="button" onClick={state.clearOfferFilters}>Tümünü temizle</button>
          <button type="button" onClick={state.resetOfferFiltersForScenario}>Senaryoya dön</button>
        </div>

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

        <fieldset className="filter-bar__group filter-bar__regions">
          <legend>Bölgeler</legend>
          <div className="filter-bar__region-groups">
            {providers.map((provider) => (
              <div className="filter-bar__region-provider" role="group" aria-label={provider.name} key={provider.id}>
                <p>{provider.shortName}</p>
                <div className="filter-bar__choices">
                  {provider.regions.map((region) => {
                    const key = `${provider.id}:${region.id}` as const
                    return (
                      <button
                        className="filter-bar__button"
                        key={key}
                        type="button"
                        aria-label={`${provider.name} · ${region.name}`}
                        aria-pressed={state.selectedRegionKeys.has(key)}
                        onClick={() => state.toggleRegion(provider.id, region.id)}
                      >
                        {region.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
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
      </div> : null}
    </section>
  )
}
