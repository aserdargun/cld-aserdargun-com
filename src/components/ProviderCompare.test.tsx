import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { loadCatalog } from '../data/catalog'
import type {
  ExchangeRate,
  Offer,
  PriceComponent,
  Provider,
  Source,
  VerificationStatus,
} from '../domain/catalog'
import type { OfferEstimate, PriceLineItemEstimate } from '../domain/pricing'
import type { RankedProviderEstimate } from '../domain/ranking'
import { ProviderCompare } from './ProviderCompare'

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
  mutate: (provider: Provider) => void
}

const awsProvenanceMutations: AwsProvenanceMutation[] = [
  {
    label: 'used-region source has the wrong owner',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'azure-regions'
    },
  },
  {
    label: 'used-region source has the wrong kind',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'aws-turkey-purchase'
    },
  },
  {
    label: 'used-region source is missing',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'missing-region-source'
    },
  },
  {
    label: 'purchase source has the wrong owner',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['gcp-purchase-currency']
    },
  },
  {
    label: 'purchase source has the wrong kind',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['aws-regions']
    },
  },
  {
    label: 'purchase source is missing',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['missing-purchase-source']
    },
  },
  {
    label: 'purchase evidence is empty',
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

function providerProvenanceSources(providerId: Provider['id']) {
  const provider = catalog.providers.find((candidate) => candidate.id === providerId)
  if (!provider) throw new Error(`Seeded ${providerId} provider is required for provenance tests`)
  const sourceIds = new Set([
    ...provider.purchaseSourceIds,
    ...provider.regions.map((region) => region.sourceId),
  ])
  return catalog.sources.filter((source) => sourceIds.has(source.id))
}

const computeComponent: PriceComponent = {
  kind: 'instance-hour',
  price: 0.02,
  currency: 'USD',
  includedQuantity: 0,
}

function offerEstimate(
  providerId: Offer['providerId'],
  region: string,
  verifiedAt: string,
  totalUsd: number,
  status: VerificationStatus = 'current',
  idSuffix = region,
  component: PriceComponent = computeComponent,
): OfferEstimate {
  const priceLine: PriceLineItemEstimate = {
    component,
    quantity: 730,
    includedQuantity: 0,
    freeTierQuantity: 0,
    subtotalBeforeFreeTierUsd: totalUsd,
    freeTierSavingsUsd: 0,
    totalUsd,
  }
  return {
    offer: {
      id: `${providerId}-${idSuffix}`,
      providerId,
      serviceName: `${providerId.toUpperCase()} test compute`,
      category: 'compute',
      rankable: true,
      region,
      specs: { vcpu: 2, ramGb: 4 },
      prices: [component],
      sourceIds: [`${providerId}-pricing-source`],
      verifiedAt,
      notes: [],
    },
    status,
    lineItems: [priceLine],
    subtotalBeforeFreeTierUsd: totalUsd,
    freeTierSavingsUsd: 0,
    totalUsd,
  }
}

function estimate(
  providerId: RankedProviderEstimate['providerId'],
  totalUsd: number | null,
  lineItems: OfferEstimate[] | null = null,
): RankedProviderEstimate {
  const resolvedLineItems = lineItems ?? (totalUsd === null ? [] : [
    offerEstimate(providerId, defaultRegionByProvider[providerId], '2026-08-13', totalUsd),
  ])
  return {
    providerId,
    rank: null,
    status: totalUsd === null ? 'invalid' : 'current',
    totalUsd,
    subtotalBeforeFreeTierUsd: totalUsd,
    lineItems: resolvedLineItems,
    missingCategories: totalUsd === null ? ['compute'] : [],
    missingDimensions: [],
  }
}

const comparableEstimates = [
  estimate('azure', 12.5),
  estimate('gcp', 14.75),
  estimate('aws', 18.25),
  estimate('hetzner', 20),
  estimate('cloudflare', 21.5),
  estimate('oracle', null),
]

interface CompareViewOptions {
  providers?: readonly Provider[]
  exchangeRates?: readonly ExchangeRate[]
  sources?: readonly Source[]
  statusByExchangeRateId?: Readonly<Record<string, VerificationStatus>>
}

function compareView(
  estimates: readonly RankedProviderEstimate[],
  options: CompareViewOptions = {},
) {
  return (
    <ProviderCompare
      estimates={estimates}
      providers={options.providers ?? providers}
      exchangeRates={options.exchangeRates ?? catalog.exchangeRates}
      sources={options.sources ?? catalog.sources}
      statusByExchangeRateId={
        options.statusByExchangeRateId ?? currentExchangeRateStatuses
      }
    />
  )
}

afterEach(cleanup)

describe('ProviderCompare', () => {
  it('selects the first three comparable providers and enforces a four-provider limit', async () => {
    const user = userEvent.setup()
    render(compareView(comparableEstimates))

    const comparison = screen.getByRole('region', { name: 'Sağlayıcıları karşılaştır' })
    expect(comparison).toHaveAttribute('id', 'saglayici-karsilastirma')
    expect(within(comparison).getByRole('button', { name: 'Azure' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(comparison).getByRole('button', { name: 'GCP' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(comparison).getByText('Genel liste fiyatı')).toBeInTheDocument()
    expect(within(comparison).getAllByText('Bilgi amaçlı; tahmine uygulanmadı')).toHaveLength(3)
    expect(within(comparison).queryByText('0,00 USD/ay')).not.toBeInTheDocument()
    expect(comparison).not.toHaveTextContent('Oracle Cloud Infrastructure')

    await user.click(within(comparison).getByRole('button', { name: 'Hetzner' }))

    expect(within(comparison).getByText('En fazla 4 sağlayıcı seçebilirsiniz')).toBeInTheDocument()
    expect(within(comparison).getByRole('button', { name: 'Cloudflare' })).toBeDisabled()
    expect(within(comparison).getByRole('button', { name: 'Azure' })).not.toBeDisabled()
    expect(within(comparison).getByRole('button', { name: 'Hetzner' })).not.toBeDisabled()
    expect(within(comparison).getAllByText('Kapsam')).toHaveLength(4)
    expect(within(comparison).getAllByText('Eksiksiz')).toHaveLength(4)
  })

  it('resets its selection when a selected fourth provider loses valid region-source provenance', async () => {
    const user = userEvent.setup()
    const { rerender } = render(compareView(comparableEstimates))

    await user.click(screen.getByRole('button', { name: 'Hetzner' }))
    expect(screen.getByRole('button', { name: 'Hetzner' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cloudflare' })).toBeDisabled()

    const providersWithInvalidHetznerRegion = structuredClone(providers)
    const hetzner = providersWithInvalidHetznerRegion.find((provider) => provider.id === 'hetzner')
    if (!hetzner) throw new Error('Seeded Hetzner provider is required for provenance tests')
    hetzner.regions.find((region) => region.id === 'nbg1')!.sourceId = 'azure-regions'
    rerender(compareView(comparableEstimates, {
      providers: providersWithInvalidHetznerRegion,
    }))

    expect(screen.queryByRole('button', { name: 'Hetzner' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Azure' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'GCP' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'AWS' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cloudflare' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Cloudflare' })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Cloudflare' }))
    expect(screen.getByRole('button', { name: 'Cloudflare' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('En fazla 4 sağlayıcı seçebilirsiniz')).toBeInTheDocument()
  })

  it('keeps the last selected provider selected', async () => {
    const user = userEvent.setup()
    render(compareView([estimate('azure', 12.5)]))

    const azure = screen.getByRole('button', { name: 'Azure' })
    expect(azure).toHaveAttribute('aria-pressed', 'true')

    await user.click(azure)

    expect(azure).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'Microsoft Azure' })).toBeInTheDocument()
  })

  it('shows only the AWS region used by the estimate and its latest offer verification date', () => {
    render(compareView([
      estimate('aws', 18.25, [
        offerEstimate('aws', 'eu-central-1', '2026-08-12', 18.25),
      ]),
    ]))

    const card = screen.getByRole('article', { name: 'Amazon Web Services' })
    const regions = within(card).getByText('Bölgeler').closest('div')
    const verification = within(card).getByText('Son doğrulama').closest('div')

    expect(regions).toHaveTextContent('Europe (Frankfurt) · DE')
    expect(regions).not.toHaveTextContent('CloudFront global edge network')
    expect(within(verification!).getByText('12 Ağustos 2026')).toHaveAttribute(
      'datetime',
      '2026-08-12',
    )
  })

  it.each(awsProvenanceMutations)(
    'removes the AWS selector and card when $label',
    ({ mutate }) => {
      render(compareView([estimate('aws', 18)], {
        providers: providersWithAwsMutation(mutate),
      }))

      expect(screen.queryByRole('button', { name: 'AWS' })).not.toBeInTheDocument()
      expect(screen.queryByRole('article', { name: 'Amazon Web Services' }))
        .not.toBeInTheDocument()
      expect(screen.queryByText('18,00 USD/ay')).not.toBeInTheDocument()
    },
  )

  it('updates to the region actually selected by a filtered-region estimate', () => {
    const { rerender } = render(compareView([
      estimate('vultr', 10, [offerEstimate('vultr', 'fra', '2026-08-10', 10)]),
    ]))

    let card = screen.getByRole('article', { name: 'Vultr' })
    expect(within(card).getByText('Bölgeler').closest('div')).toHaveTextContent('Frankfurt · DE')

    rerender(compareView([
      estimate('vultr', 11, [offerEstimate('vultr', 'ams', '2026-08-13', 11)]),
    ]))

    card = screen.getByRole('article', { name: 'Vultr' })
    const regions = within(card).getByText('Bölgeler').closest('div')
    expect(regions).toHaveTextContent('Amsterdam · NL')
    expect(regions).not.toHaveTextContent('Frankfurt')
  })

  it('deduplicates every region used by a multi-region estimate and uses the latest date', () => {
    render(compareView([
      estimate('aws', 18, [
        offerEstimate('aws', 'eu-central-1', '2026-08-10', 8, 'current', 'frankfurt-1'),
        offerEstimate('aws', 'global', '2026-08-13', 6, 'current', 'global'),
        offerEstimate('aws', 'eu-central-1', '2026-08-11', 4, 'current', 'frankfurt-2'),
      ]),
    ]))

    const card = screen.getByRole('article', { name: 'Amazon Web Services' })
    const regions = within(card).getByText('Bölgeler').closest('div')
    const verification = within(card).getByText('Son doğrulama').closest('div')

    expect(regions).toHaveTextContent(
      'Europe (Frankfurt) · DE · CloudFront global edge network · Global',
    )
    expect(regions?.textContent?.match(/Europe \(Frankfurt\)/g)).toHaveLength(1)
    expect(within(verification!).getByText('13 Ağustos 2026')).toHaveAttribute(
      'datetime',
      '2026-08-13',
    )
  })

  it('excludes estimates with missing, unknown-region, or invalid-date evidence', () => {
    const { rerender } = render(compareView([estimate('aws', 18, [])]))

    expect(screen.queryByRole('button', { name: 'AWS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Amazon Web Services' })).not.toBeInTheDocument()
    expect(screen.queryByText('18,00 USD/ay')).not.toBeInTheDocument()

    rerender(compareView([
      estimate('aws', 18, [
        offerEstimate('aws', 'unknown-region', '2026-08-13', 18),
      ]),
    ]))

    expect(screen.queryByRole('button', { name: 'AWS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Amazon Web Services' })).not.toBeInTheDocument()
    expect(screen.queryByText('18,00 USD/ay')).not.toBeInTheDocument()

    rerender(compareView([
      estimate('aws', 18, [
        offerEstimate('aws', 'eu-central-1', 'not-a-date', 18),
      ]),
    ]))

    expect(screen.queryByRole('button', { name: 'AWS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Amazon Web Services' })).not.toBeInTheDocument()
    expect(screen.queryByText('18,00 USD/ay')).not.toBeInTheDocument()
  })

  it('never exposes a numeric ProviderCompare card for invalid EUR conversion evidence', () => {
    const eurComponent: PriceComponent = { ...computeComponent, currency: 'EUR' }
    const eurEstimate = estimate('hetzner', 10, [
      offerEstimate('hetzner', 'nbg1', '2026-08-13', 10, 'current', 'eur', eurComponent),
    ])

    render(compareView([eurEstimate], {
      exchangeRates: [],
      sources: [],
      statusByExchangeRateId: {},
    }))

    expect(screen.queryByRole('button', { name: 'Hetzner' })).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Hetzner' })).not.toBeInTheDocument()
    expect(screen.queryByText('10,00 USD/ay')).not.toBeInTheDocument()
  })

  it('keeps a valid EUR estimate eligible with evidence bounded by the offer date', () => {
    const ecbSource = catalog.sources.find((source) => source.id === 'ecb-daily-exr')!
    const datedRates: ExchangeRate[] = [
      {
        id: 'ecb-before-offer',
        base: 'EUR',
        quote: 'USD',
        rate: 1.1,
        date: '2026-08-12',
        sourceId: ecbSource.id,
      },
      {
        id: 'ecb-after-offer',
        base: 'EUR',
        quote: 'USD',
        rate: 1.2,
        date: '2026-08-14',
        sourceId: ecbSource.id,
      },
    ]
    const eurComponent: PriceComponent = { ...computeComponent, currency: 'EUR' }
    const eurEstimate = estimate('hetzner', 10, [
      offerEstimate('hetzner', 'nbg1', '2026-08-13', 10, 'current', 'eur', eurComponent),
    ])

    render(compareView([eurEstimate], {
      exchangeRates: datedRates,
      sources: [ecbSource, ...providerProvenanceSources('hetzner')],
      statusByExchangeRateId: {
        'ecb-before-offer': 'current',
        'ecb-after-offer': 'current',
      },
    }))

    expect(screen.getByRole('button', { name: 'Hetzner' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('article', { name: 'Hetzner' })).toHaveTextContent('10,00 USD/ay')
  })
})
