import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Offer, PriceComponent, ServiceCategory, VerificationStatus } from '../domain/catalog'
import type { OfferEstimate, PriceLineItemEstimate } from '../domain/pricing'
import type { RankedProviderEstimate } from '../domain/ranking'
import { ScenarioSummary } from './ScenarioSummary'

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

function offer(providerId: Offer['providerId'], prices: PriceComponent[]): Offer {
  return {
    id: `${providerId}-test-offer`,
    providerId,
    serviceName: `${providerId.toUpperCase()} test compute`,
    category: 'compute',
    rankable: true,
    region: 'westeurope',
    specs: { vcpu: 2, ramGb: 4, storageGb: 50, outboundGb: 100 },
    prices,
    sourceIds: [`${providerId}-pricing-source`],
    verifiedAt: '2026-08-13',
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
): OfferEstimate {
  return {
    offer: offer(providerId, lineItems.map((lineItem) => lineItem.component)),
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

function rankedEstimate({
  providerId,
  rank = null,
  status = 'current',
  totalUsd = 20,
  subtotalBeforeFreeTierUsd = totalUsd,
  lineItems = [],
  missingCategories = [],
}: {
  providerId: RankedProviderEstimate['providerId']
  rank?: RankedProviderEstimate['rank']
  status?: VerificationStatus
  totalUsd?: number | null
  subtotalBeforeFreeTierUsd?: number | null
  lineItems?: OfferEstimate[]
  missingCategories?: ServiceCategory[]
}): RankedProviderEstimate {
  return {
    providerId,
    rank,
    status,
    totalUsd,
    subtotalBeforeFreeTierUsd,
    lineItems,
    missingCategories,
  }
}

afterEach(cleanup)

describe('ScenarioSummary', () => {
  it('renders rank labels from each estimate instead of its array position', () => {
    render(
      <ScenarioSummary
        estimates={[
          rankedEstimate({ providerId: 'azure', rank: 'second-price', totalUsd: 20 }),
          rankedEstimate({ providerId: 'gcp', rank: 'best-price', totalUsd: 10 }),
          rankedEstimate({ providerId: 'aws', status: 'stale', totalUsd: 30 }),
        ]}
      />,
    )

    expect(within(screen.getByRole('listitem', { name: 'Microsoft Azure' })).getByText('İkinci')).toBeInTheDocument()
    expect(within(screen.getByRole('listitem', { name: 'Google Cloud' })).getByText('En düşük tahmin')).toBeInTheDocument()

    const stale = within(screen.getByRole('listitem', { name: 'Amazon Web Services' })).getByText(
      'Yeniden doğrulanmalı',
    )
    expect(stale).toHaveAttribute('data-status', 'stale')
  })

  it('lists missing categories and never turns a null total into zero dollars', () => {
    render(
      <ScenarioSummary
        estimates={[
          rankedEstimate({
            providerId: 'oracle',
            status: 'invalid',
            totalUsd: null,
            subtotalBeforeFreeTierUsd: null,
            missingCategories: ['compute', 'object-storage'],
          }),
        ]}
      />,
    )

    const oracle = screen.getByRole('listitem', { name: 'Oracle Cloud Infrastructure' })
    expect(oracle).toHaveTextContent('Doğrulanamadı')
    expect(oracle).toHaveTextContent('Eksik kategoriler: Hesaplama, Nesne depolama')
    expect(oracle).not.toHaveTextContent('$0')
    expect(oracle).not.toHaveTextContent('0,00 USD/ay')
  })

  it('shows rounded UI totals, actual savings, traffic share, region and expandable line items', async () => {
    const user = userEvent.setup()
    const lines = [
      priceLine(computeComponent, 8.075, 2, 6.075),
      priceLine(trafficComponent, 4.2706, 0.2206, 4.05),
    ]
    const estimate = rankedEstimate({
      providerId: 'azure',
      rank: 'best-price',
      totalUsd: 10.125,
      subtotalBeforeFreeTierUsd: 12.3456,
      lineItems: [offerLine('azure', lines)],
    })

    render(<ScenarioSummary estimates={[estimate]} />)

    const azure = screen.getByRole('listitem', { name: 'Microsoft Azure' })
    expect(azure).toHaveTextContent('10,13 USD/ay')
    expect(azure).toHaveTextContent('Ücretsiz katman öncesi 12,35 USD/ay')
    expect(azure).toHaveTextContent('Uygulanan ücretsiz katman indirimi 2,22 USD/ay')
    expect(azure).toHaveTextContent('Trafik payı %40')
    expect(estimate.totalUsd).toBe(10.125)

    const disclosure = within(azure).getByText('Maliyet ayrıntılarını göster').closest('details')
    expect(disclosure).not.toBeNull()
    await user.click(within(azure).getByText('Maliyet ayrıntılarını göster'))

    expect(azure).toHaveTextContent('westeurope')
    expect(azure).toHaveTextContent('AZURE test compute')
    expect(azure).toHaveTextContent('Çalışma süresi')
    expect(azure).toHaveTextContent('Dış trafik')
    expect(azure).toHaveTextContent('100 birim')
    expect(within(disclosure!).getByText('Ücretsiz katman öncesi')).toBeInTheDocument()
  })
})
