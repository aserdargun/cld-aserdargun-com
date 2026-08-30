import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { getCatalogHealth, getUsableExchangeRates, loadCatalog } from '../data/catalog'
import type {
  ExchangeRate,
  Offer,
  PriceComponent,
  Provider,
  ScenarioUsageDimension,
  ServiceCategory,
  Source,
  VerificationStatus,
} from '../domain/catalog'
import type { OfferEstimate, PriceLineItemEstimate } from '../domain/pricing'
import { estimateProvider, type RankedProviderEstimate } from '../domain/ranking'
import { DecisionSummary } from './DecisionSummary'

const catalog = loadCatalog()
const providers = catalog.providers
const currentExchangeRateStatuses = Object.fromEntries(
  catalog.exchangeRates.map((exchangeRate) => [exchangeRate.id, 'current' as const]),
)

const defaultRegionByProvider: Record<Offer['providerId'], string> = {
  azure: 'westeurope',
  gcp: 'europe-west1',
  aws: 'eu-central-1',
  hetzner: 'nbg1',
  oracle: 'eu-frankfurt-1',
  cloudflare: 'global',
  digitalocean: 'fra1',
  vultr: 'fra',
}

interface AwsProvenanceMutation {
  label: string
  expectedReason: string
  mutate: (provider: Provider) => void
}

const awsProvenanceMutations: AwsProvenanceMutation[] = [
  {
    label: 'used-region source has the wrong owner',
    expectedReason: 'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'azure-regions'
    },
  },
  {
    label: 'used-region source has the wrong kind',
    expectedReason: 'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'aws-turkey-purchase'
    },
  },
  {
    label: 'used-region source is missing',
    expectedReason: 'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'missing-region-source'
    },
  },
  {
    label: 'purchase source has the wrong owner',
    expectedReason: 'Sağlayıcının satın alma kaynağı doğrulanamadı.',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['gcp-purchase-currency']
    },
  },
  {
    label: 'purchase source has the wrong kind',
    expectedReason: 'Sağlayıcının satın alma kaynağı doğrulanamadı.',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['aws-regions']
    },
  },
  {
    label: 'purchase source is missing',
    expectedReason: 'Sağlayıcının satın alma kaynağı doğrulanamadı.',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['missing-purchase-source']
    },
  },
  {
    label: 'purchase evidence is empty',
    expectedReason: 'Sağlayıcının satın alma kaynağı doğrulanamadı.',
    mutate: (provider) => {
      provider.purchaseSourceIds = []
    },
  },
]

function providersWithAwsMutation(mutate: (provider: Provider) => void): Provider[] {
  const mutatedProviders = structuredClone(catalog.providers)
  const aws = mutatedProviders.find((provider) => provider.id === 'aws')
  if (!aws) throw new Error('Seeded AWS provider is required for provenance tests')
  mutate(aws)
  return mutatedProviders
}

const computeComponent: PriceComponent = {
  kind: 'instance-hour',
  price: 0.02,
  currency: 'USD',
  includedQuantity: 0,
}

const trafficComponent: PriceComponent = {
  kind: 'outbound-gb',
  price: 0.1,
  currency: 'USD',
  includedQuantity: 0,
}

function offer(
  providerId: Offer['providerId'],
  prices: PriceComponent[],
  region = defaultRegionByProvider[providerId],
  verifiedAt = '2026-08-13',
  idSuffix = region,
): Offer {
  return {
    id: `${providerId}-test-offer-${idSuffix}`,
    providerId,
    serviceName: `${providerId.toUpperCase()} test compute`,
    category: 'compute',
    rankable: true,
    region,
    specs: { vcpu: 2, ramGb: 4, storageGb: 50, outboundGb: 100 },
    prices,
    sourceIds: [`${providerId}-pricing-source`],
    verifiedAt,
    notes: [],
  }
}

function priceLine(
  component: PriceComponent,
  subtotalBeforeFreeTierUsd: number,
  freeTierSavingsUsd: number,
  totalUsd: number,
): PriceLineItemEstimate {
  return {
    component,
    quantity: component.kind === 'outbound-gb' ? 100 : 730,
    includedQuantity: 0,
    freeTierQuantity: freeTierSavingsUsd > 0 ? 10 : 0,
    subtotalBeforeFreeTierUsd,
    freeTierSavingsUsd,
    totalUsd,
  }
}

function offerLine(
  providerId: Offer['providerId'],
  lineItems: PriceLineItemEstimate[],
  status: VerificationStatus = 'current',
  region = defaultRegionByProvider[providerId],
  verifiedAt = '2026-08-13',
  idSuffix = region,
): OfferEstimate {
  return {
    offer: offer(
      providerId,
      lineItems.map((lineItem) => lineItem.component),
      region,
      verifiedAt,
      idSuffix,
    ),
    status,
    lineItems,
    subtotalBeforeFreeTierUsd: lineItems.reduce(
      (sum, lineItem) => sum + (lineItem.subtotalBeforeFreeTierUsd ?? 0),
      0,
    ),
    freeTierSavingsUsd: lineItems.reduce(
      (sum, lineItem) => sum + (lineItem.freeTierSavingsUsd ?? 0),
      0,
    ),
    totalUsd: lineItems.reduce((sum, lineItem) => sum + (lineItem.totalUsd ?? 0), 0),
  }
}

function renderSummary(
  estimates: readonly RankedProviderEstimate[],
  evidence: {
    providers?: readonly Provider[]
    exchangeRates?: readonly ExchangeRate[]
    sources?: readonly Source[]
    statusByExchangeRateId?: Readonly<Record<string, VerificationStatus>>
  } = {},
) {
  return render(
    <DecisionSummary
      estimates={estimates}
      providers={evidence.providers ?? providers}
      exchangeRates={evidence.exchangeRates ?? catalog.exchangeRates}
      sources={evidence.sources ?? catalog.sources}
      statusByExchangeRateId={evidence.statusByExchangeRateId ?? currentExchangeRateStatuses}
    />,
  )
}

function rankedEstimate({
  providerId,
  rank = null,
  status = 'current',
  totalUsd = 20,
  subtotalBeforeFreeTierUsd = totalUsd,
  lineItems = [],
  missingCategories = [],
  missingDimensions = [],
}: {
  providerId: RankedProviderEstimate['providerId']
  rank?: RankedProviderEstimate['rank']
  status?: VerificationStatus
  totalUsd?: number | null
  subtotalBeforeFreeTierUsd?: number | null
  lineItems?: OfferEstimate[]
  missingCategories?: ServiceCategory[]
  missingDimensions?: ScenarioUsageDimension[]
}): RankedProviderEstimate {
  return {
    providerId,
    rank,
    status,
    totalUsd,
    subtotalBeforeFreeTierUsd,
    lineItems,
    missingCategories,
    missingDimensions,
  }
}

function exclusionReasons(result: HTMLElement): string[] {
  const reasons = within(result).getByText('Hariç tutulma nedenleri').closest('div')
  if (!reasons) throw new Error('Expected an exclusion-reason container')
  return within(reasons).getAllByRole('listitem').map((item) => item.textContent ?? '')
}

afterEach(cleanup)

describe('DecisionSummary', () => {
  it('features at most three current complete estimates and keeps all other results closed', () => {
    const estimates = [
      rankedEstimate({
        providerId: 'azure',
        rank: 'best-price',
        totalUsd: 11,
        subtotalBeforeFreeTierUsd: 12,
        lineItems: [offerLine('azure', [priceLine(trafficComponent, 12, 1, 11)])],
      }),
      rankedEstimate({
        providerId: 'gcp',
        rank: 'second-price',
        totalUsd: 13.75,
        subtotalBeforeFreeTierUsd: 14.75,
        lineItems: [offerLine('gcp', [priceLine(computeComponent, 14.75, 1, 13.75)])],
      }),
      rankedEstimate({
        providerId: 'aws',
        totalUsd: 16.5,
        subtotalBeforeFreeTierUsd: 17.5,
        lineItems: [offerLine('aws', [priceLine(computeComponent, 17.5, 1, 16.5)])],
      }),
      rankedEstimate({ providerId: 'hetzner', totalUsd: 19.8, subtotalBeforeFreeTierUsd: 21.8 }),
      rankedEstimate({
        providerId: 'oracle',
        status: 'invalid',
        totalUsd: null,
        subtotalBeforeFreeTierUsd: null,
        missingCategories: ['compute', 'object-storage'],
        missingDimensions: ['hoursPerMonth', 'storageGb'],
      }),
    ]

    renderSummary(estimates)

    const summary = screen.getByRole('region', { name: 'Karar özeti' })
    expect(summary).toHaveAttribute('id', 'sonuclar')
    expect(within(summary).getAllByRole('listitem', { name: /doğrulanmış tahmin/i })).toHaveLength(3)
    expect(summary).toHaveTextContent('En düşük doğrulanmış tahmin')
    expect(summary).not.toHaveTextContent('Önerilen')
    expect(summary).toHaveTextContent('En düşük tahmine göre')
    expect(summary).toHaveTextContent('+2,75 USD · %25')
    expect(summary).toHaveTextContent('En büyük maliyet kalemi')
    expect(summary).toHaveTextContent('Dış trafik')

    const incomplete = within(summary).getByText('Eksik kanıt veya kapsam').closest('details')
    expect(incomplete).not.toBeNull()
    expect(incomplete).not.toHaveAttribute('open')
    expect(incomplete).toHaveTextContent('Hetzner')
    expect(incomplete).toHaveTextContent('Oracle Cloud Infrastructure')
    expect(incomplete).toHaveTextContent('Eksik kategoriler: Hesaplama, Nesne depolama')
    expect(incomplete).toHaveTextContent('Eksik kullanım boyutları: Çalışma süresi, Depolama')
    expect(summary).not.toHaveTextContent('0,00 USD/ay')
  })

  it('shows the public-list-price basis and metadata-mapped region for a USD-only result', () => {
    const estimate = rankedEstimate({
      providerId: 'azure',
      rank: 'best-price',
      totalUsd: 14.6,
      lineItems: [offerLine('azure', [priceLine(computeComponent, 14.6, 0, 14.6)])],
    })

    renderSummary([estimate])

    const result = screen.getByRole('listitem', { name: 'Microsoft Azure doğrulanmış tahmin' })
    const regions = within(result).getByText('Kullanılan bölgeler').closest('div')
    const priceBasis = within(result).getByText('Fiyat tabanı').closest('div')

    expect(regions).toHaveTextContent('West Europe (Netherlands) · NL')
    expect(regions).not.toHaveTextContent('westeurope')
    expect(priceBasis).toHaveTextContent('Vergiler hariç genel liste fiyatı')
    expect(priceBasis).toHaveTextContent('Özgün para birimi: USD')
    expect(priceBasis).not.toHaveTextContent('ECB dönüşümü')
  })

  it('shows original EUR context with the exact dated ECB conversion evidence', () => {
    const eurComponent: PriceComponent = {
      ...computeComponent,
      price: 0.0088,
      currency: 'EUR',
    }
    const estimate = rankedEstimate({
      providerId: 'hetzner',
      rank: 'best-price',
      totalUsd: 6.332166,
      subtotalBeforeFreeTierUsd: 6.332166,
      lineItems: [offerLine('hetzner', [priceLine(eurComponent, 6.332166, 0, 6.332166)])],
    })

    renderSummary([estimate])

    const result = screen.getByRole('listitem', { name: 'Hetzner doğrulanmış tahmin' })
    const priceBasis = within(result).getByText('Fiyat tabanı').closest('div')
    const rateDate = within(priceBasis!).getByText('13 Ağustos 2026')

    expect(priceBasis).toHaveTextContent('Vergiler hariç genel liste fiyatı')
    expect(priceBasis).toHaveTextContent('Özgün para birimi: EUR')
    expect(priceBasis).toHaveTextContent('ECB dönüşümü: 1 EUR = 1,1534 USD')
    expect(rateDate).toHaveAttribute('datetime', '2026-08-13')
    expect(priceBasis).toHaveTextContent('ECB daily EUR reference exchange rate for USD on 13 August 2026')
  })

  it('deduplicates and maps every region actually used by a multi-region estimate', () => {
    const frankfurt = offerLine(
      'aws',
      [priceLine(computeComponent, 8, 0, 8)],
      'current',
      'eu-central-1',
      '2026-08-10',
      'frankfurt-1',
    )
    const repeatedFrankfurt = offerLine(
      'aws',
      [priceLine(trafficComponent, 4, 0, 4)],
      'current',
      'eu-central-1',
      '2026-08-11',
      'frankfurt-2',
    )
    const global = offerLine(
      'aws',
      [priceLine(trafficComponent, 3, 0, 3)],
      'current',
      'global',
      '2026-08-13',
      'global',
    )
    const estimate = rankedEstimate({
      providerId: 'aws',
      rank: 'best-price',
      totalUsd: 15,
      lineItems: [frankfurt, repeatedFrankfurt, global],
    })

    renderSummary([estimate])

    const result = screen.getByRole('listitem', { name: 'Amazon Web Services doğrulanmış tahmin' })
    const regions = within(result).getByText('Kullanılan bölgeler').closest('div')
    expect(regions).toHaveTextContent(
      'Europe (Frankfurt) · DE · CloudFront global edge network · Global',
    )
    expect(regions?.textContent?.match(/Europe \(Frankfurt\)/g)).toHaveLength(1)
    expect(regions).not.toHaveTextContent('eu-central-1')
  })

  it('keeps a cheaper EUR estimate with invalid conversion evidence out of ranks and deltas', () => {
    const eurComponent: PriceComponent = { ...computeComponent, currency: 'EUR' }
    const invalidEur = rankedEstimate({
      providerId: 'hetzner',
      rank: 'best-price',
      totalUsd: 10,
      subtotalBeforeFreeTierUsd: 10,
      lineItems: [offerLine('hetzner', [priceLine(eurComponent, 10, 0, 10)])],
    })
    const validUsd = rankedEstimate({
      providerId: 'azure',
      rank: 'second-price',
      totalUsd: 20,
      subtotalBeforeFreeTierUsd: 20,
      lineItems: [offerLine('azure', [priceLine(computeComponent, 20, 0, 20)])],
    })

    renderSummary([invalidEur, validUsd], { exchangeRates: [], statusByExchangeRateId: {} })

    const summary = screen.getByRole('region', { name: 'Karar özeti' })
    const validResult = within(summary).getByRole('listitem', {
      name: 'Microsoft Azure doğrulanmış tahmin',
    })
    expect(validResult).toHaveTextContent('En düşük doğrulanmış tahmin')
    expect(validResult).toHaveTextContent('Baz tahmin')
    expect(validResult).not.toHaveTextContent(/\+10,00 USD/)

    const invalidResult = within(summary).getByRole('listitem', { name: 'Hetzner eksik sonuç' })
    expect(invalidResult).not.toHaveTextContent('En düşük doğrulanmış tahmin')
    expect(invalidResult).not.toHaveTextContent('En düşük tahmine göre')
    expect(invalidResult).not.toHaveTextContent(/USD\/ay/)
    expect(invalidResult).toHaveTextContent(
      'Fiyat tabanı için gerekli ECB dönüşüm kanıtı doğrulanamadı.',
    )
    expect(exclusionReasons(invalidResult)).toEqual([
      'Fiyat tabanı için gerekli ECB dönüşüm kanıtı doğrulanamadı.',
    ])
    expect(invalidResult).toHaveTextContent('Doğrulanamadı')
    expect(invalidResult).not.toHaveTextContent('Güncel')
    expect(within(summary).queryByRole('listitem', { name: 'Hetzner doğrulanmış tahmin' }))
      .not.toBeInTheDocument()
  })

  it.each(awsProvenanceMutations)(
    'hides AWS numeric output and explains exclusion when $label',
    ({ mutate, expectedReason }) => {
      const aws = rankedEstimate({
        providerId: 'aws',
        rank: 'best-price',
        totalUsd: 18,
        lineItems: [offerLine('aws', [priceLine(computeComponent, 18, 0, 18)])],
      })
      const azure = rankedEstimate({
        providerId: 'azure',
        rank: 'second-price',
        totalUsd: 20,
        lineItems: [offerLine('azure', [priceLine(computeComponent, 20, 0, 20)])],
      })

      renderSummary([aws, azure], { providers: providersWithAwsMutation(mutate) })

      const summary = screen.getByRole('region', { name: 'Karar özeti' })
      const validResult = within(summary).getByRole('listitem', {
        name: 'Microsoft Azure doğrulanmış tahmin',
      })
      const invalidResult = within(summary).getByRole('listitem', {
        name: 'Amazon Web Services eksik sonuç',
      })

      expect(validResult).toHaveTextContent('En düşük doğrulanmış tahmin')
      expect(validResult).toHaveTextContent('Baz tahmin')
      expect(validResult).not.toHaveTextContent(/\+2,00 USD/)
      expect(invalidResult).toHaveTextContent(expectedReason)
      expect(exclusionReasons(invalidResult)).toEqual([expectedReason])
      expect(invalidResult).toHaveTextContent('Doğrulanamadı')
      expect(invalidResult).not.toHaveTextContent('Güncel')
      expect(invalidResult).not.toHaveTextContent('En düşük doğrulanmış tahmin')
      expect(invalidResult).not.toHaveTextContent('En düşük tahmine göre')
      expect(invalidResult).not.toHaveTextContent(/USD\/ay/)
      expect(within(summary).queryByRole('listitem', {
        name: 'Amazon Web Services doğrulanmış tahmin',
      })).not.toBeInTheDocument()
    },
  )

  it('explains missing provider metadata without exposing numeric output', () => {
    renderSummary([
      rankedEstimate({
        providerId: 'aws',
        rank: 'best-price',
        totalUsd: 18,
        lineItems: [offerLine('aws', [priceLine(computeComponent, 18, 0, 18)])],
      }),
    ], { providers: providers.filter((provider) => provider.id !== 'aws') })

    const result = screen.getByRole('listitem', { name: 'AWS eksik sonuç' })
    expect(result).toHaveTextContent('Sağlayıcı kaydı doğrulanamadı.')
    expect(exclusionReasons(result)).toEqual(['Sağlayıcı kaydı doğrulanamadı.'])
    expect(result).not.toHaveTextContent(
      'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.',
    )
    expect(result).not.toHaveTextContent(/USD\/ay/)
  })

  it('explains invalid verification-date evidence without exposing numeric output', () => {
    renderSummary([
      rankedEstimate({
        providerId: 'aws',
        rank: 'best-price',
        totalUsd: 18,
        lineItems: [offerLine(
          'aws',
          [priceLine(computeComponent, 18, 0, 18)],
          'current',
          'eu-central-1',
          'not-a-date',
        )],
      }),
    ])

    const result = screen.getByRole('listitem', { name: 'Amazon Web Services eksik sonuç' })
    expect(result).toHaveTextContent('Tekliflerin doğrulama tarihi doğrulanamadı.')
    expect(exclusionReasons(result)).toEqual(['Tekliflerin doğrulama tarihi doğrulanamadı.'])
    expect(result).not.toHaveTextContent('Fiyat tabanı doğrulanamadı.')
    expect(result).not.toHaveTextContent(/USD\/ay/)
  })

  it('shows one truthful reason for a real seeded partial estimate', () => {
    const health = getCatalogHealth(catalog, new Date('2026-08-29T00:00:00.000Z'))
    const scenario = catalog.scenarios.find((candidate) => candidate.id === 'small-web-app')
    if (!scenario) throw new Error('Seeded small-web-app scenario is required for this test')
    const partial = estimateProvider('hetzner', catalog.offers, scenario, {
      exchangeRates: getUsableExchangeRates(catalog, health),
      freeTiers: catalog.freeTiers,
      statusByOfferId: health.statusByOfferId,
      statusByFreeTierId: health.statusByFreeTierId,
      statusByExchangeRateId: health.statusByExchangeRateId,
    })

    expect(partial.lineItems).toHaveLength(1)
    expect(partial.missingCategories).toEqual(['object-storage', 'cdn-network'])
    renderSummary([{ ...partial, rank: null }], {
      statusByExchangeRateId: health.statusByExchangeRateId,
    })

    const result = screen.getByRole('listitem', { name: 'Hetzner eksik sonuç' })
    expect(exclusionReasons(result)).toEqual([
      'Tahmin güncel ve eksiksiz olarak doğrulanamadı.',
    ])
    expect(result).not.toHaveTextContent(
      'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.',
    )
    expect(result).not.toHaveTextContent('Tekliflerin doğrulama tarihi doğrulanamadı.')
    expect(result).not.toHaveTextContent('Fiyat tabanı doğrulanamadı.')
    expect(result).not.toHaveTextContent('En düşük tahmine göre')
    expect(result).not.toHaveTextContent(/USD\/ay/)
  })

  it('shows a fail-closed empty state when no complete current estimate exists', () => {
    renderSummary([
          rankedEstimate({
            providerId: 'oracle',
            status: 'invalid',
            totalUsd: null,
            subtotalBeforeFreeTierUsd: null,
            missingCategories: ['compute'],
          }),
        ])

    const summary = screen.getByRole('region', { name: 'Karar özeti' })
    expect(summary).toHaveTextContent('Bu senaryo için eksiksiz tahmin bulunamadı')
    expect(summary).toHaveTextContent('Eksik sonuçları incele')
    expect(summary).not.toHaveTextContent(/USD\/ay/)
  })

  it('keeps a stale estimate with a numeric total in the price-less incomplete group', () => {
    renderSummary([
          rankedEstimate({
            providerId: 'azure',
            rank: 'best-price',
            totalUsd: 20,
            lineItems: [offerLine('azure', [priceLine(computeComponent, 20, 0, 20)])],
          }),
          rankedEstimate({ providerId: 'gcp', status: 'stale', totalUsd: 12.5 }),
        ])

    const summary = screen.getByRole('region', { name: 'Karar özeti' })
    expect(within(summary).getByRole('listitem', { name: 'Microsoft Azure doğrulanmış tahmin' }))
      .toHaveTextContent('20,00 USD/ay')
    const stale = within(summary).getByRole('listitem', { name: 'Google Cloud eksik sonuç' })
    expect(stale).toHaveTextContent('30 günden eski')
    expect(stale).toHaveTextContent('Tahmin güncel ve eksiksiz olarak doğrulanamadı.')
    expect(exclusionReasons(stale)).toEqual([
      'Tahmin güncel ve eksiksiz olarak doğrulanamadı.',
    ])
    expect(stale).not.toHaveTextContent(
      'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.',
    )
    expect(stale).not.toHaveTextContent('Tekliflerin doğrulama tarihi doğrulanamadı.')
    expect(stale).not.toHaveTextContent('Fiyat tabanı doğrulanamadı.')
    expect(stale).not.toHaveTextContent('12,50 USD/ay')
    expect(stale).not.toHaveTextContent(/USD\/ay/)
  })

  it('preserves rounded totals, discounts, traffic share, region, line items and notes', async () => {
    const user = userEvent.setup()
    const lines = [
      priceLine(computeComponent, 8.075, 2, 6.075),
      priceLine(trafficComponent, 4.2706, 0.2206, 4.05),
    ]
    const selectedOffer = offerLine('azure', lines)
    selectedOffer.offer.notes = ['Yedekleme ve lisans dahil değildir.', 'Vergiler hariçtir.']
    const estimate = rankedEstimate({
      providerId: 'azure',
      rank: 'best-price',
      totalUsd: 10.125,
      subtotalBeforeFreeTierUsd: 12.3456,
      lineItems: [selectedOffer],
    })

    renderSummary([estimate])

    const azure = screen.getByRole('listitem', { name: 'Microsoft Azure doğrulanmış tahmin' })
    expect(within(azure).getByLabelText('Modellenen aylık tutar')).toHaveTextContent('10,13 USD/ay')
    expect(azure).toHaveTextContent('Ücretsiz katman öncesi 12,35 USD/ay')
    expect(azure).toHaveTextContent('Uygulanan ücretsiz katman indirimi 2,22 USD/ay')
    expect(azure).toHaveTextContent('Trafik payı %40')
    expect(estimate.totalUsd).toBe(10.125)

    const disclosure = within(azure).getByText('Ayrıntıları göster').closest('details')
    expect(disclosure).not.toBeNull()
    expect(disclosure).not.toHaveAttribute('open')
    await user.click(within(azure).getByText('Ayrıntıları göster'))

    expect(azure).toHaveTextContent('westeurope')
    expect(azure).toHaveTextContent('AZURE test compute')
    expect(azure).toHaveTextContent('Çalışma süresi')
    expect(azure).toHaveTextContent('Dış trafik')
    expect(azure).toHaveTextContent('100 birim')
    expect(azure).toHaveTextContent('Kapsam ve hariçler')
    expect(azure).toHaveTextContent('Yedekleme ve lisans dahil değildir.')
    expect(azure).toHaveTextContent('Vergiler hariçtir.')
  })
})
