# Cloud Provider Karşılaştırma Uygulaması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Türkiye'den satın alınabilen bulut hizmetlerini resmî ve tarihli fiyat kaynaklarıyla karşılaştıran, senaryo bazlı USD maliyet hesabı yapan Türkçe bir statik web uygulaması geliştirmek ve `aserdargun/cld-aserdargun-com` GitHub deposuna göndermek.

**Architecture:** React/TypeScript/Vite tabanlı tek sayfalı uygulama, sürümlü JSON kataloglarını Zod şemalarıyla yükler. Saf TypeScript fiyat motoru teklif uygunluğunu, para birimi dönüşümünü, ücretsiz kotaları ve aylık maliyet dökümünü hesaplar; React bileşenleri yalnız doğrulanmış sonuçları tablo, senaryo özeti ve sağlayıcı ayrıntıları olarak sunar.

**Tech Stack:** React, TypeScript, Vite, Zod, Lucide React, Vitest, Testing Library, Playwright, ESLint, CSS custom properties, npm

## Global Constraints

- Arayüz dili Türkçedir; para birimi USD'dir.
- Azure, Google Cloud ve AWS ana sağlayıcılardır; Hetzner Cloud, Oracle Cloud, Cloudflare, DigitalOcean ve Vultr fiyat odaklı alternatiflerdir.
- Kategoriler sanal sunucu, GPU/AI, nesne depolama, yönetilen veritabanı, serverless, CDN/ağ ve Kubernetes'tir.
- Kullanım senaryoları küçük web uygulaması, API/backend, veritabanlı SaaS, statik site, AI/GPU ve yüksek trafikli servistir.
- Türkiye'den genel kullanıma açık satın alma ve Türkiye'ye yakın Avrupa bölgeleri esas alınır.
- Fiyatlar vergiler hariçtir; indirim kodu, özel sözleşme ve kurumsal kredi içermez.
- Sürekli çalışan işlem kaynağı aylık hesabında 730 saat kullanılır.
- USD dışı resmî fiyatlar, doğrulama günündeki Avrupa Merkez Bankası referans kuruyla dönüştürülür; özgün para birimi, kur ve kur tarihi görünür.
- Her görünen fiyat ve ücretsiz teklif resmî sağlayıcı kaynağı, erişim tarihi ve doğrulama tarihi taşır.
- 30 günden eski fiyat “yeniden doğrulanmalı” olarak işaretlenir; eksik veya doğrulanamayan fiyat sıfır kabul edilmez ve sıralamaya girmez.
- Mobil karşılaştırma tablosu kartlara dönüşmez; yatay kaydırma ve sabit ilk sütun kullanır.
- Azure üzerinde kaynak oluşturulmaz ve `cld.aserdargun.com` yayını yapılmaz.
- Son dış işlem, GitHub'da `aserdargun/cld-aserdargun-com` deposuna gönderimdir; bundan sonra çalışma durur.

## Planned File Structure

```text
.
├── .github/workflows/quality.yml
├── docs/{methodology.md,updating-data.md}
├── e2e/core-flow.spec.ts
├── public/favicon.svg
├── scripts/validate-catalog.ts
├── src/
│   ├── app/{App.tsx,App.test.tsx,useComparisonState.ts,useComparisonState.test.ts}
│   ├── components/
│   │   ├── ComparisonTable.tsx
│   │   ├── FilterBar.tsx
│   │   ├── FreeTierTable.tsx
│   │   ├── Hero.tsx
│   │   ├── Methodology.tsx
│   │   ├── ProviderDetails.tsx
│   │   ├── ScenarioCalculator.tsx
│   │   ├── ScenarioSummary.tsx
│   │   ├── SourceLink.tsx
│   │   └── StatusBadge.tsx
│   ├── data/
│   │   ├── {catalog.ts,catalog.test.ts,schemas.ts}
│   │   └── {providers,sources,offers,free-tiers,exchange-rates,scenarios}.json
│   ├── domain/{catalog.ts,pricing.ts,pricing.test.ts,ranking.ts,ranking.test.ts}
│   ├── styles/global.css
│   ├── test/setup.ts
│   └── main.tsx
├── eslint.config.js
├── index.html
├── package.json
├── playwright.config.ts
├── README.md
├── tsconfig*.json
└── vite.config.ts
```

---

### Task 1: Project Foundation and Test Harness

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `playwright.config.ts`, `eslint.config.js`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/App.test.tsx`, `src/test/setup.ts`
- Create: `src/styles/global.css`, `public/favicon.svg`, `.gitignore`

**Interfaces:**
- Consumes: Onaylı tasarım belgesi ve Global Constraints.
- Produces: `App(): JSX.Element`; `dev`, `build`, `lint`, `test`, `validate:data`, `e2e`, `check` npm komutları.

- [ ] **Step 1: Install application and quality dependencies**

```bash
npm install react react-dom zod lucide-react
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh @types/react @types/react-dom @playwright/test tsx
```

Expected: `package.json` and `package-lock.json` are created without install errors.

- [ ] **Step 2: Configure exact project commands**

Use these `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "validate:data": "tsx scripts/validate-catalog.ts",
    "e2e": "playwright test",
    "check": "npm run lint && npm run test && npm run validate:data && npm run build"
  }
}
```

Configure Vite with React; Vitest with `jsdom` and `src/test/setup.ts`; Playwright with `http://127.0.0.1:4173`; ESLint with TypeScript and React Hooks. Enable TypeScript strict mode and `noUncheckedIndexedAccess`.

- [ ] **Step 3: Write the failing smoke test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('introduces the Turkish cloud comparison product', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /bulut maliyetlerini karşılaştır/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run the test and confirm the expected failure**

Run: `npm run test -- src/app/App.test.tsx`

Expected: FAIL because `src/app/App.tsx` does not exist.

- [ ] **Step 5: Implement the minimal shell**

```tsx
export function App() {
  return (
    <main>
      <h1>Bulut maliyetlerini karşılaştır</h1>
      <p>Türkiye'den satın alınabilen servisler için kaynaklı USD analizi.</p>
    </main>
  )
}
```

Create the React entry point, navy/gray CSS variables, a minimal reset, a visible focus ring, explicit body/control typography and a reduced-motion rule.

- [ ] **Step 6: Verify and commit the foundation**

Run: `npm run lint && npm run test && npm run build`

Expected: all commands exit 0 and `dist/index.html` exists.

```bash
git add package.json package-lock.json index.html vite.config.ts playwright.config.ts eslint.config.js tsconfig*.json src public .gitignore
git commit -m "chore: bootstrap cloud comparison app"
```

---

### Task 2: Catalog Contracts and Validation

**Files:**
- Create: `src/domain/catalog.ts`
- Create: `src/data/schemas.ts`, `src/data/catalog.ts`, `src/data/catalog.test.ts`
- Create: `src/data/providers.json`, `sources.json`, `offers.json`, `free-tiers.json`, `exchange-rates.json`, `scenarios.json`

**Interfaces:**
- Consumes: Zod and JSON module support from Task 1.
- Produces: `ProviderId`, `ServiceCategory`, `Catalog`, `Offer`, `FreeTier`, `Scenario`, `loadCatalog(): Catalog`, `getCatalogHealth(catalog, today): CatalogHealth`.

- [ ] **Step 1: Define exact catalog types**

```ts
export const providerIds = [
  'azure', 'gcp', 'aws', 'hetzner', 'oracle', 'cloudflare', 'digitalocean', 'vultr',
] as const
export type ProviderId = (typeof providerIds)[number]

export const serviceCategories = [
  'compute', 'gpu-ai', 'object-storage', 'managed-database',
  'serverless', 'cdn-network', 'kubernetes',
] as const
export type ServiceCategory = (typeof serviceCategories)[number]

export type VerificationStatus = 'current' | 'stale' | 'invalid'
export type PurchaseAvailability = 'verified' | 'conditional' | 'unverified'
export type Currency = 'USD' | 'EUR'
export type PriceKind = 'instance-hour' | 'flat-month' | 'storage-gb-month' |
  'outbound-gb' | 'requests-million' | 'database-gb-month' | 'gpu-hour'

export interface PriceComponent {
  kind: PriceKind
  price: number
  currency: Currency
  includedQuantity: number
  monthlyCap?: number
}

export interface Offer {
  id: string
  providerId: ProviderId
  serviceName: string
  category: ServiceCategory
  region: string
  specs: { vcpu?: number; ramGb?: number; storageGb?: number; gpuModel?: string; gpuVramGb?: number }
  prices: PriceComponent[]
  sourceIds: string[]
  verifiedAt: string
  notes: string[]
}
```

Define the remaining contracts exactly as follows. Source IDs are foreign keys; URLs are not duplicated in offers.

```ts
export type FreeTierType =
  | 'new-account-credit' | 'time-limited' | 'always-free' | 'eligibility-limited'

export interface Provider {
  id: ProviderId
  name: string
  shortName: string
  officialSite: string
  purchaseAvailability: PurchaseAvailability
  purchaseNote: string
  verifiedAt: string
  strengths: string[]
  limitations: string[]
  regions: Array<{
    id: string
    name: string
    countryCode: string
    sourceId: string
  }>
}

export interface Source {
  id: string
  owner: ProviderId | 'ecb'
  title: string
  url: string
  kind: 'pricing' | 'free-tier' | 'regions' | 'purchase' | 'exchange-rate'
  accessedAt: string
}

export interface ExchangeRate {
  id: string
  base: 'EUR'
  quote: 'USD'
  rate: number
  date: string
  sourceId: string
}

export interface FreeTier {
  id: string
  providerId: ProviderId
  serviceName: string
  category: ServiceCategory
  type: FreeTierType
  quota: { amount: number; unit: string; period: 'once' | 'month' }
  durationMonths: number | null
  eligibilityNote: string
  overageNote: string
  automaticChargeNote: string
  sourceIds: string[]
  verifiedAt: string
}

export interface Scenario {
  id: string
  name: string
  description: string
  requiredCategories: ServiceCategory[]
  hoursPerMonth: number
  vcpu: number
  ramGb: number
  storageGb: number
  outboundGb: number
  requestsMillion: number
  databaseGb: number
  gpuHours: number
  gpuVramGb: number
}

export interface Catalog {
  providers: Provider[]
  sources: Source[]
  offers: Offer[]
  freeTiers: FreeTier[]
  exchangeRates: ExchangeRate[]
  scenarios: Scenario[]
}

export interface CatalogHealth {
  statusByOfferId: Record<string, VerificationStatus>
  statusByFreeTierId: Record<string, VerificationStatus>
  invalidReferences: string[]
  staleCount: number
  invalidCount: number
}
```

- [ ] **Step 2: Write failing schema tests**

```ts
it('rejects an offer without an official source', () => {
  const result = catalogSchema.safeParse({
    providers: [], sources: [], exchangeRates: [], scenarios: [], freeTiers: [],
    offers: [{ id: 'bad-offer', sourceIds: [] }],
  })
  expect(result.success).toBe(false)
})

it('rejects negative prices', () => {
  const result = priceComponentSchema.safeParse({
    kind: 'instance-hour', price: -1, currency: 'USD', includedQuantity: 0,
  })
  expect(result.success).toBe(false)
})
```

Run: `npm run test -- src/data/catalog.test.ts`

Expected: FAIL because the schemas do not exist.

- [ ] **Step 3: Implement strict Zod schemas and loading**

Enforce ISO dates, non-negative quantities, positive prices, non-empty `sourceIds`, HTTPS URLs, allowed enums and strict objects. Implement:

```ts
export function loadCatalog(): Catalog {
  return catalogSchema.parse({ providers, sources, offers, freeTiers, exchangeRates, scenarios })
}

export function getCatalogHealth(catalog: Catalog, today: Date): CatalogHealth {
  // current at 0–30 days; stale above 30; invalid when a source foreign key is missing
}
```

Seed all eight providers, all six scenario definitions, one official provider source each and empty offer/free-tier arrays.

- [ ] **Step 4: Add referential-integrity and date-boundary tests**

Prove `loadCatalog()` succeeds, every source foreign key resolves, a record 31 days old is stale and a record exactly 30 days old is current.

- [ ] **Step 5: Verify and commit catalog contracts**

Run: `npm run test -- src/data/catalog.test.ts && npm run build`

```bash
git add src/domain/catalog.ts src/data
git commit -m "feat: define validated cloud catalog"
```

---

### Task 3: Pricing and Ranking Engines

**Files:**
- Create: `src/domain/pricing.ts`, `src/domain/pricing.test.ts`
- Create: `src/domain/ranking.ts`, `src/domain/ranking.test.ts`

**Interfaces:**
- Consumes: catalog contracts from Task 2.
- Produces: `convertToUsd`, `estimateOffer`, `estimateProvider`, `rankProviderEstimates`.

- [ ] **Step 1: Write failing currency and cost tests**

```ts
it('uses 730 hours for an always-on instance', () => {
  expect(estimateOffer(hourlyOffer(0.01), webScenario(), emptyContext()).totalUsd).toBe(7.3)
})

it('converts EUR with the dated ECB rate', () => {
  expect(convertToUsd(10, 'EUR', [{ base: 'EUR', quote: 'USD', rate: 1.1 }]))
    .toEqual({ amountUsd: 11, converted: true })
})

it('does not invent USD when the rate is missing', () => {
  expect(convertToUsd(10, 'EUR', [])).toEqual({ amountUsd: null, converted: false })
})
```

Add cases for included storage, included outbound traffic, free request quota, monthly cap and no rounding inside the engine.

- [ ] **Step 2: Confirm the tests fail**

Run: `npm run test -- src/domain/pricing.test.ts`

Expected: FAIL because pricing functions do not exist.

- [ ] **Step 3: Implement deterministic calculation**

```ts
const quantityByKind: Record<PriceKind, (scenario: Scenario) => number> = {
  'instance-hour': (s) => s.hoursPerMonth,
  'flat-month': () => 1,
  'storage-gb-month': (s) => s.storageGb,
  'outbound-gb': (s) => s.outboundGb,
  'requests-million': (s) => s.requestsMillion,
  'database-gb-month': (s) => s.databaseGb,
  'gpu-hour': (s) => s.gpuHours,
}
```

For each component calculate `raw = max(0, quantity - includedQuantity) * price`, then use `min(raw, monthlyCap)` when a cap exists. Preserve unrounded line items and return `totalUsd: null` when a required rate is absent. Apply a free tier only when eligibility and duration conditions match.

- [ ] **Step 4: Write failing ranking tests**

Prove complete results precede incomplete results, current results sort by total, stale results receive no cheapest badge, a missing category makes a bundle incomplete, and traffic-included/free-adjusted totals remain separate.

- [ ] **Step 5: Implement provider bundle selection and ranking**

For every required scenario category, select the lowest valid offer satisfying vCPU, RAM and GPU constraints. Return:

```ts
export interface ProviderEstimate {
  providerId: ProviderId
  totalUsd: number | null
  subtotalBeforeFreeTierUsd: number | null
  lineItems: OfferEstimate[]
  missingCategories: ServiceCategory[]
  status: VerificationStatus
}
```

Assign `best-price` and `second-price` only to complete, current, numeric estimates.

- [ ] **Step 6: Verify and commit pricing**

Run: `npm run test -- src/domain && npm run build`

```bash
git add src/domain
git commit -m "feat: add cloud pricing and ranking engines"
```

---

### Task 4: Official Price and Free-Tier Dataset

**Files:**
- Modify: all JSON files under `src/data/`
- Create: `scripts/validate-catalog.ts`
- Modify: `src/data/catalog.test.ts`

**Interfaces:**
- Consumes: catalog schemas and price engine from Tasks 2–3.
- Produces: source-backed catalog and a deterministic `validate:data` gate.

- [ ] **Step 1: Build the primary-source ledger before recording prices**

Browse only official pricing, calculator, free-tier, regional-availability and ECB pages. Add a `sources.json` record before adding dependent data. Required source families:

```text
azure.microsoft.com/pricing and azure.microsoft.com/free
cloud.google.com/products/calculator and cloud.google.com/free
aws.amazon.com/pricing and aws.amazon.com/free
oracle.com/cloud/pricing and oracle.com/cloud/free
hetzner.com/cloud
cloudflare.com/plans and developers.cloudflare.com product pricing pages
digitalocean.com/pricing
vultr.com/pricing
ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates
```

- [ ] **Step 2: Record purchase and region evidence**

For all eight providers record the nearest appropriate European region, `purchaseAvailability`, a concise Turkish payment/account note, evidence source and current verification date. Use `conditional` for card, identity, currency or service constraints; use `unverified` rather than inference.

- [ ] **Step 3: Record representative paid offers**

Coverage rules:

- Azure, GCP and AWS: one representative offer in every approved category they publicly offer.
- Hetzner, Oracle, Cloudflare, DigitalOcean and Vultr: at least two price-advantaged representative offers in their strongest available categories.
- Every offer: European region, resource specs, billing unit, original price/currency, included quantities, source IDs, verification date and limitation notes.
- Products with incompatible units remain visible but are not ranked against each other.

- [ ] **Step 4: Record free-tier entries**

Add at least six current Azure entries, six GCP entries, four AWS entries and four Oracle Cloud entries. Each must be one of `new-account-credit`, `time-limited`, `always-free`, `eligibility-limited` and include quota, duration, overage, automatic-charge note, source and verification date.

- [ ] **Step 5: Record ECB conversion evidence**

For accepted non-USD offers, add the verification day's `EUR -> USD` reference rate. Preserve original currency and price in every offer.

- [ ] **Step 6: Add exact dataset policy tests**

```ts
expect(catalog.providers).toHaveLength(8)
expect(new Set(catalog.providers.map((p) => p.id))).toEqual(new Set(providerIds))
expect(freeTierCount('azure')).toBeGreaterThanOrEqual(6)
expect(freeTierCount('gcp')).toBeGreaterThanOrEqual(6)
expect(freeTierCount('aws')).toBeGreaterThanOrEqual(4)
expect(freeTierCount('oracle')).toBeGreaterThanOrEqual(4)
expect(catalog.offers.every((offer) => offer.sourceIds.length > 0)).toBe(true)
expect(catalog.sources.every((source) => new URL(source.url).protocol === 'https:')).toBe(true)
```

Also assert every provider has at least one offer and official source.

- [ ] **Step 7: Implement and run the standalone validator**

`scripts/validate-catalog.ts` parses the catalog, checks foreign keys, duplicate IDs, date age, HTTPS URLs, provider coverage, free-tier minimums and required ECB rates. It prints one line per failure and exits 1; otherwise prints counts by provider/category and exits 0.

Run:

```bash
npm run validate:data
npm run test -- src/data/catalog.test.ts src/domain/pricing.test.ts
```

Expected: validator exits 0 and one manually recomputed Azure, GCP, AWS and alternative-provider example matches engine line items.

- [ ] **Step 8: Commit the sourced dataset**

```bash
git add src/data scripts/validate-catalog.ts
git commit -m "data: add sourced cloud pricing catalog"
```

---

### Task 5: Comparison State and Filters

**Files:**
- Create: `src/app/useComparisonState.ts`, `src/app/useComparisonState.test.ts`
- Create: `src/components/FilterBar.tsx`, `src/components/FilterBar.test.tsx`

**Interfaces:**
- Consumes: provider, category and scenario contracts.
- Produces: selected/editable scenario, provider/category sets, stale/free-only flags and named update actions.

- [ ] **Step 1: Write failing state tests**

Test default `small-web-app`, GPU category selection, Azure toggle isolation, a 100 GB outbound edit that preserves other fields, and preset reset.

- [ ] **Step 2: Confirm state tests fail**

Run: `npm run test -- src/app/useComparisonState.test.ts`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement named state actions**

```ts
selectScenario(id: string): void
updateScenario(patch: Partial<Scenario>): void
toggleProvider(id: ProviderId): void
toggleCategory(id: ServiceCategory): void
setFreeOnly(value: boolean): void
setIncludeStale(value: boolean): void
resetScenario(): void
```

- [ ] **Step 4: Test and implement accessible filters**

Test provider buttons with `aria-pressed`, visible category labels and the stale-data toggle. Implement semantic `fieldset`/`legend` groups on mobile and a compact desktop toolbar with explicit control typography.

Run: `npm run test -- src/app/useComparisonState.test.ts src/components/FilterBar.test.tsx`

- [ ] **Step 5: Commit state and filters**

```bash
git add src/app/useComparisonState* src/components/FilterBar*
git commit -m "feat: add comparison filters and state"
```

---

### Task 6: Scenario Calculator and Ranked Summary

**Files:**
- Create: `src/components/ScenarioCalculator.tsx`, `ScenarioCalculator.test.tsx`
- Create: `src/components/ScenarioSummary.tsx`, `ScenarioSummary.test.tsx`, `StatusBadge.tsx`

**Interfaces:**
- Consumes: Task 5 state and Task 3 `ProviderEstimate`.
- Produces: validated usage inputs and ranked result rows with cost breakdown.

- [ ] **Step 1: Write failing calculator tests**

Test preset selection, 100 GB outbound edit, negative-input rejection, reset, and labels for hours, storage, database, requests and GPU.

- [ ] **Step 2: Implement the controlled calculator**

Use number inputs with `min="0"`, unit suffixes, inline validation and the six scenario options. Hide only inputs irrelevant to the selected scenario and include an accessible requirement summary.

- [ ] **Step 3: Write failing result-status tests**

Prove the best current result shows “En düşük tahmin”, second shows “İkinci”, stale shows “Yeniden doğrulanmalı”, incomplete lists missing categories and null renders “Doğrulanamadı”, never `$0`.

- [ ] **Step 4: Implement ranked summary and breakdown**

Show USD/month, pre-free-tier subtotal, free-tier saving, traffic share, region, missing categories and expandable line items. Use text plus color for statuses.

- [ ] **Step 5: Verify and commit calculator**

Run: `npm run test -- src/components/ScenarioCalculator.test.tsx src/components/ScenarioSummary.test.tsx`

```bash
git add src/components/ScenarioCalculator* src/components/ScenarioSummary* src/components/StatusBadge.tsx
git commit -m "feat: add scenario cost calculator"
```

---

### Task 7: Comparison and Free-Tier Tables

**Files:**
- Create: `src/components/ComparisonTable.tsx`, `ComparisonTable.test.tsx`
- Create: `src/components/FreeTierTable.tsx`, `FreeTierTable.test.tsx`
- Create: `src/components/SourceLink.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: filtered offers/free tiers, catalog health and sources.
- Produces: sortable, source-linked paid and free comparison tables.

- [ ] **Step 1: Write failing comparison-table tests**

Assert provider, service, region, capacity, hourly/monthly USD, free quota, traffic, verification and source columns. Test sorting, null/stale display, original EUR plus USD conversion and safe external links.

- [ ] **Step 2: Implement the semantic comparison table**

Use `<table>` with caption, `aria-sort`, sticky provider column, labelled scroll region and row-level source/date. Format USD with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.

- [ ] **Step 3: Write failing free-tier tests**

Test all four offer types, quota/scope/duration/overage/automatic-charge columns, Azure/GCP filters and separation of permanent quota from account credit.

- [ ] **Step 4: Implement the free-tier table**

Show Azure and GCP by default, with explicit AWS/Oracle controls. Never sum credits and always-free quotas; show eligibility before cost implications.

- [ ] **Step 5: Add responsive table behavior**

Use horizontal overflow, a sticky first column, visible focus, touch targets and no mobile card transformation. Verify widths 390, 768 and 1440.

- [ ] **Step 6: Verify and commit tables**

Run: `npm run test -- src/components/ComparisonTable.test.tsx src/components/FreeTierTable.test.tsx`

```bash
git add src/components/ComparisonTable* src/components/FreeTierTable* src/components/SourceLink.tsx src/styles/global.css
git commit -m "feat: add sourced comparison tables"
```

---

### Task 8: Provider Details and Full Page

**Files:**
- Create: `src/components/Hero.tsx`, `ProviderDetails.tsx`, `ProviderDetails.test.tsx`, `Methodology.tsx`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: all earlier domain, data, state and component interfaces.
- Produces: complete single-page flow with validated catalog error state.

- [ ] **Step 1: Write failing provider-detail tests**

Test all eight provider headings, strengths, limitations, European region, purchase state, payment note, verification date and official links. Verify `unverified` means uncertainty, not declared unavailability.

- [ ] **Step 2: Implement provider details and methodology**

Use an open vertical list with dividers, not a generic card grid. Methodology states 730 hours, tax exclusion, ECB conversion, 30-day freshness, comparability limits and the meaning of Turkey purchase availability.

- [ ] **Step 3: Write the failing full-flow test**

```tsx
it('updates rankings when scenario usage changes', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.selectOptions(screen.getByLabelText('Kullanım senaryosu'), 'high-traffic')
  await user.clear(screen.getByLabelText('Aylık dış trafik'))
  await user.type(screen.getByLabelText('Aylık dış trafik'), '1000')
  expect(screen.getByRole('region', { name: 'Sağlayıcı sıralaması' })).toHaveTextContent('USD/ay')
})
```

Also assert order: hero, scenario, comparison, free tier, provider details, methodology.

- [ ] **Step 4: Compose the page**

```tsx
<Hero />
<ScenarioCalculator />
<ScenarioSummary />
<FilterBar />
<ComparisonTable />
<FreeTierTable />
<ProviderDetails />
<Methodology />
```

On catalog failure show “Fiyat kataloğu doğrulanamadı. Kaynak verileri kontrol edin.” Do not insert sample totals.

- [ ] **Step 5: Finish the approved visual system**

Implement navy/light-gray bands, restrained provider accents, intentional control typography, dense tables, responsive spacing, visible sources and reduced motion. Use Lucide only for directional/status icons.

- [ ] **Step 6: Verify and commit the full page**

Run: `npm run lint && npm run test && npm run build`

```bash
git add src/app src/components src/styles
git commit -m "feat: compose cloud comparison dashboard"
```

---

### Task 9: Browser and Responsive QA

**Files:**
- Create: `e2e/core-flow.spec.ts`
- Modify: `playwright.config.ts`, affected CSS/components
- Create locally, do not commit: `work/qa/` screenshots and fidelity ledger

**Interfaces:**
- Consumes: Task 8 production build.
- Produces: repeatable browser test and verified desktop/mobile product.

- [ ] **Step 1: Write the failing Playwright flow**

Open the page, select high traffic, set 1000 GB outbound, filter Azure/GCP/AWS, expand a cost breakdown, verify a source link, scroll the table on mobile and confirm no body-level horizontal overflow.

- [ ] **Step 2: Establish the browser baseline**

Run: `npx playwright install chromium && npm run build && npm run e2e`

Expected: the first run identifies missing roles, labels, overflow or wiring before repairs.

- [ ] **Step 3: Inspect the visible product**

Use the in-app browser at 1440×1000, 768×1024 and 390×844. Capture first viewport, comparison table, free-tier table and expanded result screenshots under `work/qa/`.

- [ ] **Step 4: Complete a fidelity ledger**

Compare screenshots with the approved design for section order/copy, first-viewport balance, palette, table density, typography, source visibility, sticky mobile column, responsive overflow, status badges and active filters. Record each mismatch and exact repair in `work/qa/fidelity-ledger.md`.

- [ ] **Step 5: Fix and re-test every material issue**

Repair clipping, wrapping, contrast, default control fonts, overflow, touch targets, table behavior, inert controls, focus states and source links. Run the affected test after each repair.

- [ ] **Step 6: Complete the verification gate**

Run: `npm run check && npm run e2e`

Expected: all checks pass and screenshots have no material mismatch or broken interaction.

- [ ] **Step 7: Commit verified UI**

```bash
git add e2e playwright.config.ts src
git commit -m "test: verify responsive comparison flows"
```

---

### Task 10: Documentation, CI, and GitHub Handoff

**Files:**
- Create: `README.md`, `docs/methodology.md`, `docs/updating-data.md`
- Create: `.github/workflows/quality.yml`
- Modify: source/date data if final verification finds changes

**Interfaces:**
- Consumes: validated app and source ledger.
- Produces: public, documented repository with automated checks.

- [ ] **Step 1: Write documentation**

README covers purpose, features, provider/category coverage, local start, checks, price disclaimer, freshness, official-source rule and explicit exclusion of Azure/domain deployment.

`docs/methodology.md` explains 730 hours, original currency, ECB conversion, free-tier classification, traffic treatment, completeness and Turkey purchase-availability meaning.

`docs/updating-data.md` uses this exact sequence:

```text
1. Open the existing official source URL.
2. Confirm region, unit, currency and eligibility.
3. Update original price and verifiedAt; never edit only converted USD.
4. Add the dated ECB rate when source currency is not USD.
5. Run npm run validate:data and npm run test.
6. Review the affected UI row and source link in the browser.
```

- [ ] **Step 2: Add GitHub quality checks**

On pushes and pull requests to `main`, use Node.js 24, `npm ci`, `npm run check`, install Playwright Chromium and run `npm run e2e`. Cache npm through `actions/setup-node`.

- [ ] **Step 3: Refresh every visible official source**

Reopen every source used by a visible paid or free row. Correct changed prices, quotas, regions, eligibility and dates. A page still loading is not sufficient to mark its data current.

- [ ] **Step 4: Run the release gate**

```bash
npm ci
npm run check
npm run e2e
git diff --check
git status --short
```

Expected: all commands exit 0; only intentional documentation/data corrections remain before the final commit.

- [ ] **Step 5: Commit documentation and final corrections**

```bash
git add README.md docs .github src/data
git commit -m "docs: document pricing methodology and updates"
```

- [ ] **Step 6: Create or safely attach the GitHub repository**

First run: `gh repo view aserdargun/cld-aserdargun-com`

If missing:

```bash
gh repo create aserdargun/cld-aserdargun-com --public --description "Türkiye odaklı, kaynaklı cloud servis ve USD maliyet karşılaştırması" --source=. --remote=origin --push
```

If it exists and is empty or already holds this project:

```bash
git remote add origin https://github.com/aserdargun/cld-aserdargun-com.git
git push -u origin main
```

Do not overwrite unrelated history. Stop and report if the remote contains unrelated commits.

- [ ] **Step 7: Verify GitHub, then stop before deployment**

```bash
git status --short --branch
git ls-remote --heads origin main
gh repo view aserdargun/cld-aserdargun-com --json nameWithOwner,url,visibility,defaultBranchRef
```

Expected: clean local `main` tracks `origin/main`; GitHub reports the intended public repository and default branch. Return its GitHub URL. Do not invoke Azure, DNS, Static Web Apps, GitHub Pages or any other deployment action.
