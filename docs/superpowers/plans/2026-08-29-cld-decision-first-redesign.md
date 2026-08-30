# CLD Decision-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn CLD's source-backed cloud catalog into a decision-first comparison experience without weakening its pricing, evidence, or fail-closed guarantees.

**Architecture:** Keep the existing catalog, coverage, pricing, ranking, and comparison state modules as the source of truth. Add small presentation-model helpers, then replace the long always-expanded UI with a short scenario workspace, a three-result decision summary, an explicit provider comparison, and progressively disclosed offer/free-tier/provider evidence.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, Playwright, Lucide React, Simple Icons, CSS.

**Spec:** `docs/superpowers/specs/2026-08-29-cld-decision-first-redesign.md`

## Global Constraints

- Node.js must remain `>=22.12.0`; npm must remain `10.9.8`.
- The application remains a Turkish static React/TypeScript/Vite SPA with no server, account, runtime pricing API, or persistent user state.
- Preserve eight providers, seven service categories, six scenarios, 730 hours/month, taxes-excluded USD, original EUR values, and dated ECB conversion evidence.
- Never rank incomplete, stale-by-default, capacity-insufficient, invalid-source, or invalid-exchange-rate estimates as valid prices.
- Display estimates as public list-price estimates; do not imply contract, commitment, tax, support, license, or negotiated-price coverage.
- Free-tier records remain informational unless the existing explicit eligibility mechanism applies them; never silently apply a free tier.
- Keep all interactive targets at least 44×44 CSS px on mobile and preserve keyboard focus, reduced-motion support, and semantic table behavior.
- Use existing Lucide icons for UI actions and Simple Icons for real provider marks; do not draw substitute brand assets.
- Do not add charts, authentication, saved estimates, exports, new providers, new categories, FOCUS ingestion, or automated data refresh.
- Do not commit, push, deploy, or modify Azure/DNS. Each task ends with verification and `commit=none` unless the user separately authorizes commits.

## File Structure

### Create

- `src/domain/presentation.ts` — pure decision-summary and catalog-stat derivations.
- `src/domain/presentation.test.ts` — deterministic tests for presentation derivations.
- `src/components/ProviderMark.tsx` — provider ID to verified Simple Icons mark mapping.
- `src/components/ProviderMark.test.tsx` — provider mark semantics and fallback tests.
- `src/components/DecisionSummary.tsx` — first three comparable results and collapsed incomplete group.
- `src/components/DecisionSummary.css` — decision result layout and responsive rules.
- `src/components/ProviderCompare.tsx` — local, maximum-four-provider comparison state and table/cards.
- `src/components/ProviderCompare.test.tsx` — selection limit, reset, and uncertainty tests.
- `src/components/ProviderCompare.css` — desktop matrix and mobile comparison cards.
- `src/components/OfferExplorer.tsx` — controlled disclosure that mounts filters and the detailed offer table only on demand.
- `src/components/OfferExplorer.test.tsx` — closed/open mounting, filter count, and empty-state tests.
- `src/components/FreeTierGuide.tsx` — provider summaries and on-demand free-tier records.
- `src/components/FreeTierGuide.test.tsx` — credit/quota separation, charge-note visibility, and provider disclosure tests.

### Modify

- `package.json`, `package-lock.json` — add `simple-icons` as the only new production dependency.
- `src/app/App.tsx`, `src/app/App.test.tsx` — compose the new information architecture and preserve error behavior.
- `src/app/useComparisonState.ts`, `src/app/useComparisonState.test.ts` — scenario-focused offer filters plus clear/reset actions.
- `src/components/Hero.tsx` — new copy, CTA pair, navigation labels, and catalog trust band.
- `src/components/ScenarioCalculator.tsx`, `src/components/ScenarioCalculator.css`, `src/components/ScenarioCalculator.test.tsx` — primary/advanced fields and visible mobile scenario selection.
- `src/components/FilterBar.tsx`, `src/components/FilterBar.css`, `src/components/FilterBar.test.tsx` — collapsible filter panel, grouped regions, active count, and reset controls.
- `src/components/ComparisonTable.tsx`, `src/components/ComparisonTable.test.tsx` — six-column table and row-level evidence disclosure.
- `src/components/ProviderDetails.tsx`, `src/components/ProviderDetails.test.tsx` — provider accordions and real marks.
- `src/components/Methodology.tsx` — compact principles with explicit public-list-price boundary.
- `src/styles/global.css` — refreshed design tokens, page composition, tables, free tiers, provider details, and responsive rules.
- `e2e/core-flow.spec.ts` — decision-first desktop/mobile acceptance flow.
- `README.md` — current interaction model and verification commands.

### Remove after replacement tests pass

- `src/components/ScenarioSummary.tsx`
- `src/components/ScenarioSummary.css`
- `src/components/ScenarioSummary.test.tsx`
- `src/components/FreeTierTable.tsx`
- `src/components/FreeTierTable.test.tsx`

---

### Task 1: Add Decision Presentation Models

**Files:**
- Create: `src/domain/presentation.ts`
- Create: `src/domain/presentation.test.ts`

**Interfaces:**
- Consumes: `Catalog`, `PriceKind`, and `RankedProviderEstimate`.
- Produces: `CatalogStats`, `DecisionGroups`, `PriceDelta`, `getCatalogStats()`, `partitionDecisionEstimates()`, `priceDeltaFromBest()`, and `dominantCostKind()`.

- [ ] **Step 1: Write failing tests for catalog statistics and decision grouping**

Create focused fixtures and assertions:

```ts
import { describe, expect, it } from 'vitest'
import { loadCatalog } from '../data/catalog'
import type { RankedProviderEstimate } from './ranking'
import {
  dominantCostKind,
  getCatalogStats,
  partitionDecisionEstimates,
  priceDeltaFromBest,
} from './presentation'

function estimate(
  providerId: RankedProviderEstimate['providerId'],
  totalUsd: number | null,
  status: RankedProviderEstimate['status'] = 'current',
): RankedProviderEstimate {
  return {
    providerId,
    totalUsd,
    subtotalBeforeFreeTierUsd: totalUsd,
    lineItems: [],
    missingCategories: totalUsd === null ? ['compute'] : [],
    missingDimensions: totalUsd === null ? ['hoursPerMonth'] : [],
    status,
    rank: null,
  }
}

describe('presentation models', () => {
  it('derives trust-band counts and the latest verification date', () => {
    const catalog = loadCatalog()
    expect(getCatalogStats(catalog)).toEqual({
      providerCount: 8,
      offerCount: 41,
      sourceCount: 65,
      latestVerificationDate: '2026-08-14',
    })
  })

  it('keeps only current complete estimates in the top three', () => {
    const groups = partitionDecisionEstimates([
      estimate('azure', 40),
      estimate('gcp', 50),
      estimate('aws', 60),
      estimate('hetzner', 70),
      estimate('oracle', null, 'invalid'),
    ])
    expect(groups.featured.map((item) => item.providerId)).toEqual(['azure', 'gcp', 'aws'])
    expect(groups.remainingComparable.map((item) => item.providerId)).toEqual(['hetzner'])
    expect(groups.incomplete.map((item) => item.providerId)).toEqual(['oracle'])
  })

  it('calculates a transparent delta and never divides by zero', () => {
    expect(priceDeltaFromBest(53, 42)).toEqual({ usd: 11, percent: 26.19047619047619 })
    expect(priceDeltaFromBest(10, 0)).toBeNull()
    expect(priceDeltaFromBest(null, 42)).toBeNull()
  })

  it('returns no dominant kind when an estimate has no valid line total', () => {
    expect(dominantCostKind(estimate('azure', 10))).toBeNull()
  })
})
```

- [ ] **Step 2: Run the new test and verify the missing module failure**

Run: `npx vitest run src/domain/presentation.test.ts`

Expected: FAIL because `src/domain/presentation.ts` does not exist.

- [ ] **Step 3: Implement the pure presentation helpers**

Use exact exported shapes:

```ts
import type { Catalog, PriceKind } from './catalog'
import type { RankedProviderEstimate } from './ranking'

export interface CatalogStats {
  providerCount: number
  offerCount: number
  sourceCount: number
  latestVerificationDate: string
}

export interface DecisionGroups {
  featured: RankedProviderEstimate[]
  remainingComparable: RankedProviderEstimate[]
  incomplete: RankedProviderEstimate[]
}

export interface PriceDelta {
  usd: number
  percent: number
}

export function getCatalogStats(catalog: Catalog): CatalogStats {
  const dates = [
    ...catalog.providers.map((item) => item.verifiedAt),
    ...catalog.offers.map((item) => item.verifiedAt),
    ...catalog.freeTiers.map((item) => item.verifiedAt),
  ]
  return {
    providerCount: catalog.providers.length,
    offerCount: catalog.offers.length,
    sourceCount: catalog.sources.length,
    latestVerificationDate: dates.reduce(
      (latest, date) => date > latest ? date : latest,
      dates[0] ?? '',
    ),
  }
}

function isComparable(estimate: RankedProviderEstimate): boolean {
  return estimate.status === 'current' &&
    estimate.totalUsd !== null &&
    estimate.missingCategories.length === 0 &&
    estimate.missingDimensions.length === 0
}

export function partitionDecisionEstimates(
  estimates: readonly RankedProviderEstimate[],
): DecisionGroups {
  const comparable = estimates.filter(isComparable)
  return {
    featured: comparable.slice(0, 3),
    remainingComparable: comparable.slice(3),
    incomplete: estimates.filter((estimate) => !isComparable(estimate)),
  }
}

export function priceDeltaFromBest(
  totalUsd: number | null,
  bestUsd: number | null,
): PriceDelta | null {
  if (totalUsd === null || bestUsd === null || bestUsd <= 0) return null
  const usd = totalUsd - bestUsd
  return { usd, percent: (usd / bestUsd) * 100 }
}

export function dominantCostKind(estimate: RankedProviderEstimate): PriceKind | null {
  const totals = new Map<PriceKind, number>()
  estimate.lineItems.forEach((offerEstimate) => {
    offerEstimate.lineItems.forEach((lineItem) => {
      if (lineItem.totalUsd === null) return
      totals.set(
        lineItem.component.kind,
        (totals.get(lineItem.component.kind) ?? 0) + lineItem.totalUsd,
      )
    })
  })
  return [...totals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}
```

- [ ] **Step 4: Run presentation and existing ranking tests**

Run: `npx vitest run src/domain/presentation.test.ts src/domain/ranking.test.ts`

Expected: both files PASS; no pricing or ranking behavior changes.

- [ ] **Step 5: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: only the two new presentation files; `commit=none`.

---

### Task 2: Add Verified Provider Marks

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/ProviderMark.tsx`
- Create: `src/components/ProviderMark.test.tsx`

**Interfaces:**
- Consumes: `ProviderId`.
- Produces: `ProviderMark({ providerId, size? })` with a decorative SVG whose accessible name remains supplied by adjacent provider text.

- [ ] **Step 1: Add the icon library and verify the lockfile**

Run: `npm install simple-icons`

Expected: only `package.json` and `package-lock.json` dependency sections change; audit reports no introduced critical vulnerability.

- [ ] **Step 2: Write the failing provider mark test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProviderMark } from './ProviderMark'

describe('ProviderMark', () => {
  it('renders the exact provider mark as decorative beside visible text', () => {
    render(<div><ProviderMark providerId="azure" /><span>Microsoft Azure</span></div>)
    expect(screen.getByText('Microsoft Azure')).toBeInTheDocument()
    expect(document.querySelector('svg[data-provider="azure"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('supports every catalog provider id', () => {
    const ids = ['azure', 'gcp', 'aws', 'hetzner', 'oracle', 'cloudflare', 'digitalocean', 'vultr'] as const
    const { container } = render(<>{ids.map((id) => <ProviderMark key={id} providerId={id} />)}</>)
    expect(container.querySelectorAll('svg')).toHaveLength(8)
  })
})
```

- [ ] **Step 3: Run the test and verify the missing component failure**

Run: `npx vitest run src/components/ProviderMark.test.tsx`

Expected: FAIL because `ProviderMark` does not exist.

- [ ] **Step 4: Implement the exact Simple Icons mapping**

```tsx
import {
  siAmazonwebservices,
  siCloudflare,
  siDigitalocean,
  siGooglecloud,
  siHetzner,
  siMicrosoftazure,
  siOracle,
  siVultr,
} from 'simple-icons/icons'
import type { ProviderId } from '../domain/catalog'

const marks = {
  azure: siMicrosoftazure,
  gcp: siGooglecloud,
  aws: siAmazonwebservices,
  hetzner: siHetzner,
  oracle: siOracle,
  cloudflare: siCloudflare,
  digitalocean: siDigitalocean,
  vultr: siVultr,
} as const satisfies Record<ProviderId, { path: string }>

export function ProviderMark({ providerId, size = 20 }: { providerId: ProviderId; size?: number }) {
  const mark = marks[providerId]
  return (
    <svg
      aria-hidden="true"
      data-provider={providerId}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      focusable="false"
    >
      <path d={mark.path} />
    </svg>
  )
}
```

- [ ] **Step 5: Run component test, lint, and dependency audit**

Run: `npx vitest run src/components/ProviderMark.test.tsx && npm run lint && npm audit --omit=dev`

Expected: PASS; no TypeScript/ESLint import errors; no critical production vulnerability.

- [ ] **Step 6: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: dependency files plus `ProviderMark` files; `commit=none`.

---

### Task 3: Replace the Hero with a Trust-Led Entry Point

**Files:**
- Modify: `src/components/Hero.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `CatalogStats` from Task 1.
- Produces: `Hero({ stats })`, anchors for `#senaryolar`, `#sonuclar`, `#karsilastirma`, `#ucretsiz-katmanlar`, and `#metodoloji`.

- [ ] **Step 1: Update App tests to require new copy, navigation, and derived counts**

Add assertions:

```tsx
expect(screen.getByRole('heading', {
  name: 'Bulut maliyetini senaryona göre karşılaştır',
  level: 1,
})).toBeInTheDocument()
expect(screen.getByText('8 sağlayıcı')).toBeInTheDocument()
expect(screen.getByText('41 teklif')).toBeInTheDocument()
expect(screen.getByText('65 resmî kaynak')).toBeInTheDocument()
expect(screen.getByText('Genel liste fiyatı · Vergiler hariç · USD')).toBeInTheDocument()
expect(screen.getByRole('link', { name: 'Hesaplamaya başla' })).toHaveAttribute('href', '#senaryolar')
expect(screen.getByRole('link', { name: 'Yöntemi ve kaynakları incele' })).toHaveAttribute('href', '#metodoloji')
```

- [ ] **Step 2: Run the App test and verify old-copy failures**

Run: `npx vitest run src/app/App.test.tsx`

Expected: FAIL on the new heading, CTA, and trust-band assertions.

- [ ] **Step 3: Update Hero and App wiring**

Replace `HeroProps` with `stats: CatalogStats`, render the dynamic date and counts, and use this navigation inventory:

```ts
const navigationItems = [
  { href: '#senaryolar', label: 'Hesapla' },
  { href: '#sonuclar', label: 'Sonuçlar' },
  { href: '#karsilastirma', label: 'Teklifler' },
  { href: '#ucretsiz-katmanlar', label: 'Ücretsiz kullanım' },
  { href: '#metodoloji', label: 'Metodoloji' },
] as const
```

Use this hero structure:

```tsx
<section className="hero" id="genel-bakis" aria-labelledby="hero-heading">
  <p className="hero__eyebrow">Kaynaklı bulut maliyet karşılaştırması</p>
  <h1 id="hero-heading">Bulut maliyetini senaryona göre karşılaştır</h1>
  <p className="hero__lede">
    Türkiye’den erişilebilen servisler için kaynaklı, vergiler hariç liste fiyatı analizi.
  </p>
  <div className="hero__actions">
    <a className="button button--primary" href="#senaryolar">Hesaplamaya başla</a>
    <a className="button button--ghost" href="#metodoloji">Yöntemi ve kaynakları incele</a>
  </div>
  <dl className="hero__trust" aria-label="Katalog güven özeti">
    <div><dt>Son doğrulama</dt><dd><time dateTime={stats.latestVerificationDate}>{formattedDate}</time></dd></div>
    <div><dt>Kapsam</dt><dd>{stats.providerCount} sağlayıcı</dd></div>
    <div><dt>Fiyat kataloğu</dt><dd>{stats.offerCount} teklif</dd></div>
    <div><dt>Kanıt</dt><dd>{stats.sourceCount} resmî kaynak</dd></div>
  </dl>
  <p className="hero__basis">Genel liste fiyatı · Vergiler hariç · USD</p>
</section>
```

In `App.tsx`, replace the old date helper call with `getCatalogStats(catalog)` and pass `<Hero stats={stats} />`.

- [ ] **Step 4: Add bounded hero styles**

Use the existing navy/blue tokens and these layout limits:

```css
.hero { padding: 46px 0 64px; }
.hero__lede { max-width: 680px; margin-top: 14px; }
.hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.hero__trust { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 36px 0 0; border-block: 1px solid rgb(255 255 255 / 18%); }
.hero__trust > div { padding: 16px 18px; }
.hero__trust > div + div { border-left: 1px solid rgb(255 255 255 / 18%); }
.hero__basis { margin-top: 12px; font-size: 0.8125rem; }
```

At `max-width: 699px`, make `.hero__trust` a two-column grid and remove left borders from odd items.

- [ ] **Step 5: Run App and Hero-adjacent tests**

Run: `npx vitest run src/app/App.test.tsx src/components/ScenarioCalculator.test.tsx`

Expected: PASS; the catalog error test remains unchanged.

- [ ] **Step 6: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: hero/App/global CSS changes only in addition to prior tasks; `commit=none`.

---

### Task 4: Make Scenario Inputs Progressive and Mobile-Safe

**Files:**
- Modify: `src/components/ScenarioCalculator.tsx`
- Modify: `src/components/ScenarioCalculator.css`
- Modify: `src/components/ScenarioCalculator.test.tsx`

**Interfaces:**
- Consumes: unchanged `ScenarioCalculatorProps`.
- Produces: visible mobile scenario select, `Temel kullanım` group, and `Gelişmiş kullanım ayarları` disclosure.

- [ ] **Step 1: Add failing tests for field grouping and mobile-safe selection semantics**

Add tests that render the small-web preset and assert:

```tsx
expect(screen.getByLabelText('Kullanım senaryosu').closest('label')).not.toHaveClass('visually-hidden')
expect(screen.getByRole('group', { name: 'Temel kullanım' })).toContainElement(
  screen.getByLabelText('Aylık çalışma süresi'),
)
const advanced = screen.getByText('Gelişmiş kullanım ayarları').closest('details')
expect(advanced).not.toBeNull()
expect(advanced).not.toHaveAttribute('open')
expect(within(advanced!).getByLabelText('Aylık GPU kullanımı')).toBeInTheDocument()
expect(screen.getByText('Bu tahmine dahil')).toBeInTheDocument()
expect(screen.getByText('Dahil değil')).toBeInTheDocument()
```

Keep the existing ArrowRight/Home/End tab tests intact.

- [ ] **Step 2: Run the calculator tests and verify failures**

Run: `npx vitest run src/components/ScenarioCalculator.test.tsx`

Expected: FAIL because the select is visually hidden and advanced grouping does not exist.

- [ ] **Step 3: Split fields from the immutable selected preset**

Add this derivation after `activeTabId`:

```ts
const selectedPreset = scenarios.find((scenario) => scenario.id === state.scenario.id) ?? state.scenario
const primaryFields = fields.filter((field) => selectedPreset[field.key] > 0)
const advancedFields = fields.filter((field) => selectedPreset[field.key] === 0)
```

Extract existing field markup into a local `renderField(field)` function so the same validation, IDs, values, units, and change handlers are used in both groups.

- [ ] **Step 4: Render explicit basic and advanced groups**

Use this structure inside the form:

```tsx
<label className="scenario-calculator__scenario" htmlFor={`${formId}-scenario`}>
  <span>Kullanım senaryosu</span>
  <select id={`${formId}-scenario`} value={state.scenario.id} onChange={(event) => state.selectScenario(event.target.value)}>
    {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenarioLabels[scenario.id] ?? scenario.name}</option>)}
  </select>
</label>
<fieldset className="scenario-calculator__fieldset" aria-label="Temel kullanım">
  <legend>Temel kullanım</legend>
  <div className="scenario-calculator__fields">{primaryFields.map(renderField)}</div>
</fieldset>
<details className="scenario-calculator__advanced">
  <summary>Gelişmiş kullanım ayarları</summary>
  <div className="scenario-calculator__fields">{advancedFields.map(renderField)}</div>
</details>
```

Replace the old scope note with two visible labels derived without inventing new pricing facts:

```tsx
<aside className="scenario-calculator__scope-note" role="note" aria-label="Modelleme kapsamı">
  <div><strong>Bu tahmine dahil</strong><span>{categorySummary}</span></div>
  <div><strong>Dahil değil</strong><span>{state.scenario.scopeNote}</span></div>
</aside>
```

Remove `role="status"` from the continuously changing requirements summary. Add `const [announcement, setAnnouncement] = useState('')`, set it to `Hesaplama güncellendi.` only after a valid submit, and render `<p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>` so every numeric keystroke is not announced.

- [ ] **Step 5: Update responsive CSS**

Keep desktop tabs visible. At `max-width: 699px`, hide `.scenario-tabs` and show the select; at `min-width: 700px`, keep the select visually hidden but accessible. At `max-width: 479px`, force `.scenario-calculator__fields { grid-template-columns: 1fr; }`.

- [ ] **Step 6: Run calculator, App, and keyboard tests**

Run: `npx vitest run src/components/ScenarioCalculator.test.tsx src/app/App.test.tsx`

Expected: PASS; live updates, submit validation, reset, and roving tab index remain covered.

- [ ] **Step 7: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: calculator source/CSS/tests added to the working diff; `commit=none`.

---

### Task 5: Replace the Long Ranking with a Decision Summary

**Files:**
- Create: `src/components/DecisionSummary.tsx`
- Create: `src/components/DecisionSummary.css`
- Create: `src/components/DecisionSummary.test.tsx`
- Modify: `src/app/App.tsx`
- Remove after PASS: `src/components/ScenarioSummary.tsx`
- Remove after PASS: `src/components/ScenarioSummary.css`
- Remove after PASS: `src/components/ScenarioSummary.test.tsx`

**Interfaces:**
- Consumes: `RankedProviderEstimate[]`, `Provider[]`, Task 1 helpers, `ProviderMark`, and `StatusBadge`.
- Produces: `DecisionSummary({ estimates, providers })` with region ID `sonuclar` and accessible name `Karar özeti`.

- [ ] **Step 1: Write failing tests for featured and incomplete groups**

Port the existing estimate fixture helpers, then assert:

```tsx
render(<DecisionSummary estimates={estimates} providers={providers} />)
const summary = screen.getByRole('region', { name: 'Karar özeti' })
expect(within(summary).getAllByRole('listitem', { name: /doğrulanmış tahmin/i })).toHaveLength(3)
expect(summary).toHaveTextContent('En düşük doğrulanmış tahmin')
expect(summary).toHaveTextContent('En düşük tahmine göre')
expect(summary).toHaveTextContent('En büyük maliyet kalemi')
const incomplete = within(summary).getByText('Eksik kanıt veya kapsam').closest('details')
expect(incomplete).not.toHaveAttribute('open')
expect(incomplete).toHaveTextContent('Oracle Cloud Infrastructure')
expect(summary).not.toHaveTextContent('0,00 USD/ay')
```

Add a zero-result test for `Bu senaryo için eksiksiz tahmin bulunamadı` and `Eksik sonuçları incele`.

- [ ] **Step 2: Run the test and verify the missing component failure**

Run: `npx vitest run src/components/DecisionSummary.test.tsx`

Expected: FAIL because `DecisionSummary` does not exist.

- [ ] **Step 3: Implement result grouping and transparent deltas**

Use `partitionDecisionEstimates(estimates)` and `priceDeltaFromBest()`; render only `groups.featured` in the primary list. Each list item must have `aria-label={`${provider.name} doğrulanmış tahmin`}` and retain the full existing line-item disclosure with sources and notes.

Use these fixed labels:

```ts
const priceKindLabels: Record<PriceKind, string> = {
  'instance-hour': 'Çalışma süresi',
  'flat-month': 'Sabit aylık ücret',
  'storage-gb-month': 'Depolama',
  'outbound-gb': 'Dış trafik',
  'requests-million': 'İstekler',
  'database-gb-month': 'Veritabanı',
  'gpu-hour': 'GPU kullanımı',
}
```

The top result label must be `En düşük doğrulanmış tahmin`; do not use `Önerilen`.

- [ ] **Step 4: Keep secondary comparable and incomplete results separate**

Render one closed disclosure:

```tsx
<details className="decision-summary__other-results">
  <summary>Diğer sonuçlar · {groups.remainingComparable.length + groups.incomplete.length}</summary>
  <section aria-labelledby="remaining-comparable-heading">
    <h3 id="remaining-comparable-heading">Diğer karşılaştırılabilir sonuçlar</h3>
    <ul>{groups.remainingComparable.map(renderSecondaryResult)}</ul>
  </section>
  <section aria-labelledby="incomplete-results-heading">
    <h3 id="incomplete-results-heading">Eksik kanıt veya kapsam</h3>
    <ul>{groups.incomplete.map(renderIncompleteResult)}</ul>
  </section>
</details>
```

Incomplete rows show provider name plus existing missing category/dimension labels only; never render a price.

- [ ] **Step 5: Wire DecisionSummary into App and remove the old component**

Replace the `ScenarioSummary` import/render with:

```tsx
<DecisionSummary estimates={estimates} providers={catalog.providers} />
```

Only after the new tests pass, remove the three `ScenarioSummary` files and all imports.

- [ ] **Step 6: Run focused and App tests**

Run: `npx vitest run src/components/DecisionSummary.test.tsx src/app/App.test.tsx src/domain/ranking.test.ts`

Expected: PASS; no incomplete estimate is shown as zero or ranked.

- [ ] **Step 7: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: new DecisionSummary files, old ScenarioSummary deletions, App wiring; `commit=none`.

---

### Task 6: Add Explicit Provider Comparison

**Files:**
- Create: `src/components/ProviderCompare.tsx`
- Create: `src/components/ProviderCompare.css`
- Create: `src/components/ProviderCompare.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `RankedProviderEstimate[]` and `Provider[]`.
- Produces: `ProviderCompare({ estimates, providers })`; local selection of one to four provider IDs reset from the first three comparable estimates whenever the comparable result signature changes.

- [ ] **Step 1: Write failing tests for defaults, selection limit, and no invented values**

```tsx
expect(screen.getByRole('region', { name: 'Sağlayıcıları karşılaştır' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Azure' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByRole('button', { name: 'GCP' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByText('En fazla 4 sağlayıcı seçebilirsiniz')).toBeInTheDocument()
expect(screen.getByText('Genel liste fiyatı')).toBeInTheDocument()
expect(screen.getByText('Bilgi amaçlı; tahmine uygulanmadı')).toBeInTheDocument()
expect(screen.queryByText('0,00 USD/ay')).not.toBeInTheDocument()
```

Use user-event to select a fourth provider and verify the fifth button becomes disabled while selected buttons remain enabled for deselection.

- [ ] **Step 2: Run the test and verify the missing component failure**

Run: `npx vitest run src/components/ProviderCompare.test.tsx`

Expected: FAIL because `ProviderCompare` does not exist.

- [ ] **Step 3: Implement reset-safe local selection**

Use this state contract:

```tsx
const comparable = estimates.filter((estimate) =>
  estimate.status === 'current' && estimate.totalUsd !== null &&
  estimate.missingCategories.length === 0 && estimate.missingDimensions.length === 0,
)
const defaultSelectionKey = comparable.slice(0, 3).map((estimate) => estimate.providerId).join('|')
const [selectedIds, setSelectedIds] = useState<Set<ProviderId>>(
  () => new Set(defaultSelectionKey.split('|').filter(Boolean) as ProviderId[]),
)
useEffect(() => {
  setSelectedIds(new Set(defaultSelectionKey.split('|').filter(Boolean) as ProviderId[]))
}, [defaultSelectionKey])
```

The toggle must refuse an unselected fifth provider but allow deselection:

```ts
function toggleProvider(providerId: ProviderId) {
  setSelectedIds((current) => {
    const next = new Set(current)
    if (next.has(providerId)) next.delete(providerId)
    else if (next.size < 4) next.add(providerId)
    return next
  })
}
```

- [ ] **Step 4: Render provider facts without a composite score**

For each selected provider, render monthly total, dominant cost kind, joined regions, coverage state, `Bilgi amaçlı; tahmine uygulanmadı`, purchase availability label, notes summary, and verification status. Use `ProviderMark`; keep purchase status wording from `ProviderDetails`.

In `ProviderCompare.css`, use a four-column matrix at 1200px and above, two-column cards from 320–1199px, and keep each card's price, status, and provider name on unbroken readable lines.

- [ ] **Step 5: Wire below DecisionSummary**

Add:

```tsx
<ProviderCompare estimates={estimates} providers={catalog.providers} />
```

Use section ID `saglayici-karsilastirma`; keep it after `#sonuclar` and before `#karsilastirma`.

- [ ] **Step 6: Run provider comparison and App tests**

Run: `npx vitest run src/components/ProviderCompare.test.tsx src/app/App.test.tsx`

Expected: PASS; default selection follows the first three comparable estimates.

- [ ] **Step 7: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: ProviderCompare files and App wiring; `commit=none`.

---

### Task 7: Put Offer Filters and Evidence Behind On-Demand Disclosure

**Files:**
- Modify: `src/app/useComparisonState.ts`
- Modify: `src/app/useComparisonState.test.ts`
- Modify: `src/components/FilterBar.tsx`
- Modify: `src/components/FilterBar.css`
- Modify: `src/components/FilterBar.test.tsx`
- Modify: `src/components/ComparisonTable.tsx`
- Modify: `src/components/ComparisonTable.test.tsx`
- Create: `src/components/OfferExplorer.tsx`
- Create: `src/components/OfferExplorer.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Extends `ComparisonState` with `clearOfferFilters()` and `resetOfferFiltersForScenario()`.
- Produces: `FilterBar` active count and `OfferExplorer` controlled disclosure.
- Preserves: provider-qualified region keys and all pricing/source evidence.

- [ ] **Step 1: Write failing state tests for scenario-focused defaults and resets**

Assert that initial `selectedCategories` equals `small-web-app.requiredCategories`, selecting `ai-gpu` replaces it with that scenario's required categories, `clearOfferFilters()` empties provider/category/region sets, and `resetOfferFiltersForScenario()` restores all providers/regions plus current scenario categories while clearing free/stale toggles.

- [ ] **Step 2: Implement state actions with stable helpers**

Add to `ComparisonState`:

```ts
clearOfferFilters: () => void
resetOfferFiltersForScenario: () => void
```

Initialize categories from the initial scenario and update them inside `selectScenario`. Implement reset using `providerIds`, current `scenario.requiredCategories`, and the existing provider-region derivation. Do not change ranking eligibility logic.

- [ ] **Step 3: Run state tests**

Run: `npx vitest run src/app/useComparisonState.test.ts`

Expected: PASS; AWS and Cloudflare `global` keys remain independent.

- [ ] **Step 4: Write failing FilterBar and OfferExplorer tests**

Require:

```tsx
expect(screen.getByRole('button', { name: /Filtreler/ })).toHaveAttribute('aria-expanded', 'false')
expect(screen.queryByRole('group', { name: 'Bölgeler' })).not.toBeInTheDocument()
await user.click(screen.getByRole('button', { name: /Filtreler/ }))
expect(screen.getByRole('group', { name: 'Bölgeler' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Tümünü temizle' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Senaryoya dön' })).toBeInTheDocument()
```

For `OfferExplorer`, assert the table is not mounted initially, `Tüm teklif ayrıntıları` opens it, and `Teklif ayrıntılarını kapat` unmounts it again.

- [ ] **Step 5: Implement the controlled filter panel**

Make `FilterBar` own only visual open/closed state. Its summary button shows `Filtreler · {activeFilterCount}`. Compute deviations from all providers, current scenario categories, all region keys, and the two boolean toggles. Group each provider's regions under a provider-labelled container rather than one flat button list.

- [ ] **Step 6: Reduce ComparisonTable to six primary columns**

Keep these columns in this order:

```ts
['Sağlayıcı', 'Servis', 'Bölge', 'Kapasite', 'Modellenen tutar', 'Durum ve ayrıntı']
```

Inside the last cell, use a disclosure containing the existing unit price, quota, traffic, verification date, notes, and source links. Preserve the existing invalid/stale/capacity/out-of-scope calculations verbatim; move presentation only.

Use this exact disclosure trigger so component and E2E tests share a stable accessible name:

```tsx
<details className="comparison-table__evidence">
  <summary aria-label="Teklif kanıtını göster">Ayrıntıları göster</summary>
  <dl className="comparison-table__evidence-list">
    <div>
      <dt>Birim fiyat</dt>
      <dd>{offerEvidenceStatus === 'invalid' || offer.prices.length === 0
        ? 'Doğrulanamadı'
        : offer.prices.map((component, index) => (
          <span className="data-table__line" key={`${component.kind}-${index}`}>
            {priceText(component, offer, usableExchangeRates, sources)}
          </span>
        ))}</dd>
    </div>
    <div><dt>Ücretsiz kota</dt><dd>{quotaText(offer, freeTiers).join(' · ')}</dd></div>
    <div><dt>Trafik</dt><dd>{trafficText(offer, offerEvidenceStatus, usableExchangeRates, sources)}</dd></div>
    <div><dt>Doğrulama</dt><dd><time dateTime={offer.verifiedAt}>{offer.verifiedAt}</time></dd></div>
  </dl>
  <section aria-label="Kapsam ve kaynak kanıtı">
    {offer.notes.length === 0 ? <p>Ek kapsam notu yok.</p> : offer.notes.map((note) => <p key={note}>{note}</p>)}
    {offer.sourceIds.map((sourceId) => <SourceLink key={sourceId} sourceId={sourceId} sources={sources} />)}
  </section>
</details>
```

Add `<p className="data-table-scroll__hint" id="offer-table-scroll-hint">Tabloyu yatay kaydırın; sağlayıcı sütunu sabit kalır.</p>` immediately before the wrapper and add `aria-describedby="offer-table-scroll-hint"` to the wrapper. Hide the hint above 699px and add an inline-end fade on mobile without covering cells or intercepting pointer events.

- [ ] **Step 7: Implement OfferExplorer mounting and empty state**

```tsx
export function OfferExplorer({ offers, filterBar, comparisonTable }: OfferExplorerProps) {
  const [open, setOpen] = useState(false)
  return (
    <section className="offer-explorer page-section" id="karsilastirma" aria-labelledby="offer-explorer-heading">
      <header className="page-section__heading">
        <div><p className="section-kicker">Kanıt katmanı</p><h2 id="offer-explorer-heading">Teklif ayrıntıları</h2></div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Teklif ayrıntılarını kapat' : `Tüm teklif ayrıntıları · ${offers.length}`}
        </button>
      </header>
      {open ? offers.length > 0 ? <>{filterBar}{comparisonTable}</> : (
        <div role="status"><h3>Bu filtrelerle eşleşen teklif yok</h3><p>Filtreleri temizleyin veya senaryo kapsamına dönün.</p></div>
      ) : null}
    </section>
  )
}
```

Use typed React node props rather than duplicating catalog logic inside `OfferExplorer`.

- [ ] **Step 8: Wire App and run all offer tests**

Run: `npx vitest run src/app/useComparisonState.test.ts src/components/FilterBar.test.tsx src/components/ComparisonTable.test.tsx src/components/OfferExplorer.test.tsx src/app/App.test.tsx`

Expected: PASS; detailed evidence is unchanged after opening, but no 41-row table is mounted at initial render.

- [ ] **Step 9: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: state, filter, table, explorer, and App changes; `commit=none`.

---

### Task 8: Replace the Free-Tier Table with a Safety-First Guide

**Files:**
- Create: `src/components/FreeTierGuide.tsx`
- Create: `src/components/FreeTierGuide.test.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/app/App.tsx`
- Remove after PASS: `src/components/FreeTierTable.tsx`
- Remove after PASS: `src/components/FreeTierTable.test.tsx`

**Interfaces:**
- Consumes: unchanged `freeTiers`, `providers`, `sources`, and `health` props.
- Produces: provider summary cards and conditionally mounted record details; exact automatic-charge notes remain source text.

- [ ] **Step 1: Write failing tests for summary cards and exact charge notes**

Port the existing four-provider fixtures and assert:

```tsx
const guide = screen.getByRole('region', { name: 'Ücretsiz kullanım rehberi' })
expect(within(guide).getByRole('button', { name: /Microsoft Azure/ })).toHaveTextContent('2 teklif')
expect(guide).toHaveTextContent('Yeni hesap kredisi var')
expect(guide).toHaveTextContent('Sürekli ücretsiz kota var')
expect(guide).toHaveTextContent('Bilgi amaçlı; tahmine uygulanmadı')
expect(screen.queryByText('Azure ücretli hesapta aşımı otomatik faturalar.')).not.toBeInTheDocument()
await user.click(within(guide).getByRole('button', { name: /Microsoft Azure/ }))
expect(screen.getByText('Azure ücretli hesapta aşımı otomatik faturalar.')).toBeInTheDocument()
```

Keep the existing assertion that `200 USD credit` and `750 instance-hours` never become a combined `950` value.

- [ ] **Step 2: Run the test and verify the missing component failure**

Run: `npx vitest run src/components/FreeTierGuide.test.tsx`

Expected: FAIL because `FreeTierGuide` does not exist.

- [ ] **Step 3: Implement honest provider summaries**

For each provider present in `freeTiers`, derive:

```ts
const summary = {
  count: providerTiers.length,
  hasCredit: providerTiers.some((tier) => tier.type === 'new-account-credit'),
  hasAlwaysFree: providerTiers.some((tier) => tier.type === 'always-free'),
  maximumDurationMonths: Math.max(0, ...providerTiers.map((tier) => tier.durationMonths ?? 0)),
  hasNonCurrent: providerTiers.some((tier) => health.statusByFreeTierId[tier.id] !== 'current'),
}
```

Do not infer a boolean automatic-charge risk from prose. The summary says `Aşım davranışı kayıt bazında değişir`; the opened record places `Aşım` and the exact `Otomatik ücret` note before eligibility and sources.

- [ ] **Step 4: Mount only the selected provider's records**

Use a single selected provider ID, default `azure`. Provider buttons are `aria-pressed`; selecting another provider replaces the mounted records instead of appending another long table.

- [ ] **Step 5: Wire App and remove FreeTierTable after passing tests**

Replace `<FreeTierTable>` with `<FreeTierGuide>` and update the section heading copy to `Ücretsiz kullanım rehberi`. Then remove the old component and test files.

- [ ] **Step 6: Run free-tier, App, and pricing tests**

Run: `npx vitest run src/components/FreeTierGuide.test.tsx src/app/App.test.tsx src/domain/pricing.test.ts`

Expected: PASS; no eligibility or quota calculation behavior changes.

- [ ] **Step 7: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: guide/App/global CSS changes and old table deletions; `commit=none`.

---

### Task 9: Collapse Provider Evidence and Clarify Methodology

**Files:**
- Modify: `src/components/ProviderDetails.tsx`
- Modify: `src/components/ProviderDetails.test.tsx`
- Modify: `src/components/Methodology.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `ProviderMark` from Task 2 and existing provider/source records.
- Produces: one-provider-at-a-time evidence disclosure and compact methodology principles.

- [ ] **Step 1: Update ProviderDetails tests for collapsed evidence**

Require eight provider disclosure buttons, zero visible provider fact bodies initially, and exact content after opening Azure. Keep the official-site/source/link-security assertions after opening the provider.

```tsx
const azureButton = screen.getByRole('button', { name: 'Microsoft Azure ayrıntılarını göster' })
expect(azureButton).toHaveAttribute('aria-expanded', 'false')
expect(screen.queryByText(catalog.providers[0]!.purchaseNote)).not.toBeInTheDocument()
await user.click(azureButton)
expect(azureButton).toHaveAttribute('aria-expanded', 'true')
expect(screen.getByText(catalog.providers[0]!.purchaseNote)).toBeInTheDocument()
```

- [ ] **Step 2: Implement controlled provider accordions**

Use `openProviderId: ProviderId | null`, `ProviderMark`, and a semantic button with `aria-controls`. Mount facts and sources only for the open provider. Preserve all existing source IDs, dates, availability text, and external-link attributes.

- [ ] **Step 3: Add explicit list-price methodology copy**

Keep the five existing principles and add this visible boundary before the comparison limits:

```tsx
<aside className="methodology__price-basis" role="note">
  <strong>Fiyat tabanı</strong>
  <p>Sonuçlar genel liste fiyatı tahminidir; taahhüt, sözleşme indirimi, vergi, destek ve lisans maliyetleri uygulanmaz.</p>
</aside>
```

Do not claim FOCUS conformance.

- [ ] **Step 4: Run provider and App tests**

Run: `npx vitest run src/components/ProviderDetails.test.tsx src/app/App.test.tsx`

Expected: PASS; all eight providers remain discoverable and every source is reachable after one disclosure.

- [ ] **Step 5: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: provider/methodology/global CSS changes; `commit=none`.

---

### Task 10: Complete the Information Architecture and Visual System

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/components/DecisionSummary.css`
- Modify: `src/components/ProviderCompare.css`
- Modify: `src/components/ScenarioCalculator.css`
- Modify: `src/components/FilterBar.css`

**Interfaces:**
- Consumes: all components from Tasks 1–9.
- Produces: final page order, responsive composition, design tokens, and no initial full-table render.

- [ ] **Step 1: Update the App order test**

Require this order:

```ts
const sectionIds = [
  'genel-bakis',
  'senaryolar',
  'sonuclar',
  'saglayici-karsilastirma',
  'karsilastirma',
  'ucretsiz-katmanlar',
  'saglayici-ayrintilari',
  'metodoloji',
]
```

Also assert no `Servis karşılaştırması` table exists before opening `Tüm teklif ayrıntıları`.

- [ ] **Step 2: Run the App test and verify order/style contract failures**

Run: `npx vitest run src/app/App.test.tsx`

Expected: FAIL until final IDs and composition are aligned.

- [ ] **Step 3: Apply the final composition**

Use one `scenario-workspace` containing the calculator, then a separate `DecisionSummary` section. Keep `ProviderCompare`, `OfferExplorer`, `FreeTierGuide`, `ProviderDetails`, and `Methodology` in the exact spec order. Footer copy remains `CLD · Kaynaklı bulut maliyet karşılaştırması`.

- [ ] **Step 4: Replace global tokens and page rhythm**

Use these base tokens:

```css
:root {
  --navy-950: #071426;
  --navy-900: #10233f;
  --navy-700: #29415f;
  --page: #f4f7fb;
  --surface: #ffffff;
  --surface-subtle: #edf4ff;
  --line: #d7e0ea;
  --muted: #5f6f82;
  --blue: #1768e5;
  --blue-dark: #0c4fb8;
  --green: #087a4b;
  --orange: #a85408;
  --red: #b42332;
  --shadow-sm: 0 8px 24px rgb(7 20 38 / 8%);
}
```

Keep the existing system font stack. Set main width to `min(100% - 48px, 1440px)`, section spacing to `64px`, and card radii to `10px`. Use `font-variant-numeric: tabular-nums` on all prices.

- [ ] **Step 5: Implement responsive constraints**

At `max-width: 1199px`, make scenario/result areas one column and ProviderCompare two columns. At `max-width: 699px`, use 24px page gutters, 44–56px section spacing, single-column decision results, and compact provider controls. At `max-width: 479px`, use 16px gutters and single-column inputs. Preserve document-level `overflow-x: hidden`; only table wrappers may scroll horizontally.

- [ ] **Step 6: Add accessibility and motion CSS**

Preserve a 3px visible focus outline, add visible `:focus-visible` states to buttons/summary controls, and include:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

- [ ] **Step 7: Run all unit/component checks**

Run: `npm run lint && npm run test && npm run validate:data && npm run build && npm run verify:dist`

Expected: all existing and new tests PASS; catalog remains `8 providers, 41 offers, 22 free-tier records, 65 sources`.

- [ ] **Step 8: Record the no-commit checkpoint**

Run: `git status --short && git diff --check`

Expected: the complete local redesign diff and no whitespace errors; `commit=none`.

---

### Task 11: Update Browser Acceptance, Documentation, and Final QA

**Files:**
- Modify: `e2e/core-flow.spec.ts`
- Modify: `README.md`
- Verify: all files changed in Tasks 1–10

**Interfaces:**
- Consumes: final UI and existing `npm run validate:codex` lifecycle.
- Produces: acceptance evidence for desktop, tablet, mobile, keyboard, horizontal overflow, source access, console health, and clean shutdown.

- [ ] **Step 1: Rewrite the desktop E2E around the decision-first flow**

The first test must perform:

```ts
await page.setViewportSize({ width: 1440, height: 1000 })
await page.goto('/')
await expect(page.getByRole('heading', { name: 'Bulut maliyetini senaryona göre karşılaştır' })).toBeVisible()
await expect(page.getByRole('region', { name: 'Karar özeti' })).toBeVisible()
await expect(page.getByRole('table', { name: 'Servis karşılaştırması' })).toHaveCount(0)
await page.getByRole('tab', { name: 'Yüksek trafik' }).click()
await page.getByLabel('Aylık dış trafik').fill('1000')
await page.getByRole('button', { name: 'Hesaplamayı güncelle' }).click()
await expect(page.getByRole('region', { name: 'Karar özeti' })).toContainText(/USD\/ay/)
await expect(page.getByRole('region', { name: 'Sağlayıcıları karşılaştır' })).toBeVisible()
await page.getByRole('button', { name: /Tüm teklif ayrıntıları/ }).click()
await expect(page.getByRole('table', { name: 'Servis karşılaştırması' })).toBeVisible()
await page.getByRole('button', { name: 'Teklif kanıtını göster' }).first().click()
await expect(page.getByRole('region', { name: 'Servis karşılaştırma tablosu' }).getByRole('link').first()).toHaveAttribute('href', /^https:\/\//)
```

Retain console warning/error collection and assert it stays empty.

- [ ] **Step 2: Rewrite the mobile E2E**

At `390×844`, verify the visible scenario select, hidden desktop tablist, one-column inputs, first decision result immediately after the form, closed offer table, provider details opening, and no document-level horizontal overflow. After opening the offer table, verify its wrapper scrolls and its first column remains sticky.

- [ ] **Step 3: Add a tablet smoke pass**

At `768×1024`, verify the hero trust grid, calculator, decision summary, and ProviderCompare do not overflow the document and all primary buttons remain at least 44px tall.

- [ ] **Step 4: Update README interaction bullets**

Document the new flow in this order: choose scenario, adjust primary/advanced usage, read top three comparable results, compare selected providers, open detailed offers, inspect free-tier risks, follow official sources. Explicitly state that free tiers are informational unless eligibility is explicitly selected and that displayed totals are taxes-excluded public list-price estimates.

- [ ] **Step 5: Run the full project contract**

Run: `npm run validate:codex`

Expected: lint, all Vitest/Node tests, catalog validation, TypeScript build, dist verification, Playwright desktop/mobile/tablet tests, and `git diff --check` PASS; the managed preview is stopped afterward.

- [ ] **Step 6: Capture fresh visual evidence with the in-app Browser**

Start with `npm run dev:codex`, then capture and inspect these current-run screenshots:

- Desktop `1440×1000`: hero + scenario + first result.
- Desktop `1440×1000`: ProviderCompare.
- Desktop `1440×1000`: opened OfferExplorer.
- Mobile `390×844`: hero + visible scenario select.
- Mobile `390×844`: first decision result.
- Mobile `390×844`: free-tier provider summary and opened record.

Inspect every saved image with `view_image`; reject blank, loading, clipped-primary-content, accidental-wrap, or wrong-state captures.

- [ ] **Step 7: Write the visual fidelity ledger**

Record at least these comparison points against the approved spec and 29 August audit screenshots: hero hierarchy, first-result visibility, typography, navy/blue palette, provider mark treatment, section order, table disclosure, mobile scenario control, mobile input columns, free-tier risk visibility, focus states, and horizontal-scroll affordance. Fix every material mismatch before proceeding.

- [ ] **Step 8: Stop the preview and verify ownership/cleanliness**

Run: `npm run stop:codex && lsof -nP -iTCP:4173 -sTCP:LISTEN || true && git diff --check && git status --short --branch`

Expected: no CLD-owned listener, unrelated listeners preserved, no diff errors, intended local files only, `commit=none`, `push=none`, `deploy=none`.

- [ ] **Step 9: Report final local outcome**

Return the local preview result, test counts, browser viewport evidence, material issues fixed, remaining intentional deviations, file links to spec/plan, and literal delivery boundary: `commit=none`, `push=none`, `deploy=none`.
