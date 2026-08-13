# Task 4 Report — Official Price and Free-Tier Dataset

## Status

Complete. The catalog contains only live official provider or ECB sources, passes the deterministic catalog validator, and meets every required provider, major-provider category, alternative-provider offer, and free-tier minimum.

- Verification/access date: `2026-08-13`
- Implementation commit: `152f198a20d15496bc4c88d1c023f3a03e9bf28e` (`data: add sourced cloud pricing catalog`)
- Providers: 8
- Paid offers: 31
- Free-tier records: 21
- Official source records: 56
- Exchange rates: 1 (`EUR -> USD`, ECB, 2026-08-13)

## Research method and exact source record

Research was performed live on 2026-08-13. Search was used only to discover official documentation. No search-result snippet, generated concept price, third-party comparison, blog, reseller, or remembered value was stored as evidence. Each accepted numeric value was read from an official static pricing/free-tier page, selected on an official interactive regional pricing page, or returned by an official public pricing catalog/API. Exact URLs, owner, evidence kind, and access date are committed in `src/data/sources.json`.

The exact primary-source families and extraction method were:

- Azure: official payment/region/free-account pages, plus filtered Azure Retail Prices API requests under `https://prices.azure.com/api/retail/prices`. The filters preserve `westeurope`, SKU/product/meter, `Consumption`, and USD where applicable. VM and database specs come from Microsoft Learn.
- Google Cloud: official currency/payment and locations documentation plus official product pricing pages. The live region selector was set to Belgium (`europe-west1`), the default on-demand option was retained, and reservation/CUD/preemptible values were not used. Cloud CDN used its Europe 0–10 TiB tier. GKE used its published cluster-management price.
- AWS: official Türkiye billing FAQ, global regions, Lightsail/Lambda/EKS/DynamoDB/SQS price pages, and the machine-readable SageMaker `eu-central-1` price list. The accepted GPU row is SKU `VXE3WDJXX6P8ECXB`, `ml.g5.xlarge-Training`, `RunInstance`, USD `1.7600000000` per `Hrs`.
- Hetzner: official payment and location documentation, the official price-adjustment page effective 2026-06-15, and the official Cloud plan page. EUR values and hourly/monthly-cap units are preserved.
- Oracle: official signup/free FAQ, region page, HTML price list and machine-readable price JSON. Accepted paid part numbers are `B93297` (Ampere A1 OCPU), `B93298` (A1 memory), and `B91628` (Object Storage). Free entitlements use the dedicated Always Free documentation.
- Cloudflare: official billing profile, network, Workers pricing and R2 pricing documentation.
- DigitalOcean: official payment, regional availability, Droplet pricing and Spaces pricing documentation.
- Vultr: official payment and Object Storage billing documentation plus public `/v2/regions`, `/v2/plans`, and `/v2/object-storage/clusters` APIs. The plan API confirms `vc2-1c-1gb` is on-demand and available in `fra`; the Object Storage clusters API confirms `ams`.
- ECB: official Data API series `EXR/D.USD.EUR.SP00.A` restricted to 2026-08-13. The returned observation is `1.1534` USD per EUR.

Important exact URLs used for machine-readable/regional values:

- ECB: `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=2026-08-13&endPeriod=2026-08-13&format=csvdata`
- AWS SageMaker Frankfurt catalog: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonSageMaker/current/eu-central-1/index.json`
- Oracle price JSON: `https://www.oracle.com/a/ocom/docs/pricing/cloud-price-list.json`
- Vultr plans: `https://api.vultr.com/v2/plans?type=vc2&per_page=100`
- Vultr regions: `https://api.vultr.com/v2/regions`
- Vultr Object Storage clusters: `https://api.vultr.com/v2/object-storage/clusters`
- GCP Workstations: `https://cloud.google.com/workstations/pricing`
- GCP GPU: `https://cloud.google.com/products/compute/gpus-pricing`
- GCP Storage: `https://cloud.google.com/storage/pricing`
- GCP Cloud SQL: `https://cloud.google.com/sql/pricing`
- GCP Cloud Run: `https://cloud.google.com/run/pricing`
- GCP CDN: `https://cloud.google.com/cdn/pricing`
- GCP GKE: `https://cloud.google.com/kubernetes-engine/pricing`

All ten exact Azure Retail Prices API URLs, including their encoded filters, are stored in `src/data/sources.json`; they were also issued live and returned HTTP 200. Representative extracted rows were independently printed during the spot-check:

- Blob Hot LRS West Europe: USD `0.0196` per `1 GB/Month`, tier minimum 0.
- PostgreSQL Flexible Server B1MS West Europe: USD `0.0199` per `1 Hour`.
- Functions Flex Consumption executions: USD `0.000004` per `10` executions, converted to USD `0.40` per million.
- Front Door Standard Zone 1 transfer out: USD `0.17` per `1 GB`, first tier.
- AKS Standard Uptime SLA West Europe: USD `0.10` per `1 Hour`.
- Standard B2s Linux West Europe: USD `0.048` per `1 Hour`; the Windows row (`0.056`) was excluded.
- NC4as T4 v3 Linux West Europe: USD `0.658` per `1 Hour`; spot, low-priority and Windows rows were excluded.

## Purchase availability decisions

- `verified`: Azure, GCP, AWS. Their official evidence explicitly identifies Türkiye/Turkey billing or accepted payment methods/currency for the country.
- `conditional`: Hetzner, Oracle, Cloudflare, DigitalOcean, Vultr. Official pages document card/account/identity/payment requirements, but do not explicitly guarantee a Turkish purchaser can complete every signup. No provider was promoted to `verified` merely because its page was reachable from Türkiye.
- Every provider has at least one provider-owned `purchase` source in `purchaseSourceIds`. The strict schema rejects an empty list, catalog parsing validates its foreign keys, catalog health reports missing references, and the standalone validator also checks source owner and kind.

## Coverage counts

| Provider | Paid offers | Categories | Free-tier entries |
|---|---:|---|---:|
| Azure | 7 | compute, gpu-ai, object-storage, managed-database, serverless, cdn-network, kubernetes | 6 |
| GCP | 7 | compute, gpu-ai, object-storage, managed-database, serverless, cdn-network, kubernetes | 6 |
| AWS | 7 | compute, gpu-ai, object-storage, managed-database, serverless, cdn-network, kubernetes | 4 |
| Hetzner | 2 | compute (CX23 and CAX11) | 0 |
| Oracle | 2 | compute, object-storage | 5 |
| Cloudflare | 2 | serverless, object-storage | 0 |
| DigitalOcean | 2 | compute, object-storage | 0 |
| Vultr | 2 | compute, object-storage | 0 |

Category totals:

- compute: 8
- gpu-ai: 3
- object-storage: 7
- managed-database: 3
- serverless: 4
- cdn-network: 3
- kubernetes: 3

Every ranked offer has a positive on-demand/list component, at least one provider-owned pricing source, a current verification date, and a note naming the principal omitted invoice components. Zero-price control planes and free entitlements are not represented as paid offers.

## Omitted or unverifiable categories

No required Azure/GCP/AWS category is missing. Unverified or weakly comparable alternative-provider rows were intentionally omitted instead of estimated:

- Hetzner: only CX23 and CAX11 compute were retained. Object Storage and managed-service categories were omitted because a comparable current regional price with equally clear unit/currency evidence was not needed to meet coverage and was not accepted conservatively.
- Oracle: only Ampere A1 compute and Standard Object Storage were retained. GPU, database, serverless, CDN/network and Kubernetes paid rows were omitted rather than combining incomplete price components.
- Cloudflare: Workers and R2 were retained. A conventional VM, managed database, GPU VM, and managed Kubernetes row would not be directly comparable to Cloudflare's edge products and was omitted.
- DigitalOcean: Basic Droplet and Spaces were retained. GPU, managed database, serverless, CDN and Kubernetes rows were omitted because the task required two strong verified alternatives, not a speculative full matrix.
- Vultr: Frankfurt Cloud Compute and the officially listed Amsterdam Object Storage cluster were retained. Other categories were omitted. An initial Frankfurt Object Storage assumption was rejected during self-review because the public clusters API lists Amsterdam, not Frankfurt.
- GCP: raw Compute Engine general-purpose VM pricing was not estimated from memory or a third-party calculator. Cloud Workstations `e2-standard-2` in Belgium was used as the exact official regional compute offer.

## RED/GREEN TDD evidence

Schema/health/policy behavior was implemented test-first.

1. First RED: 17 catalog tests, 4 failed. Failures demonstrated that `purchaseSourceIds` was not accepted, a missing purchase foreign key was invisible to health, free-tier minimums were empty, and providers had no offers.
2. Schema/health implementation GREEN for the new behavior: adding the domain field, strict non-empty schema field, catalog foreign-key validation, and health collection reduced the same run to only the two expected empty-dataset policy failures.
3. Exact policy RED: after adding major-provider category, alternative-provider count, source-owner/kind, and exclusion-note assertions, 19 catalog tests ran with 4 failures (free tiers, provider offers, major coverage, and purchase source kind).
4. Dataset GREEN: focused `src/data/catalog.test.ts` plus `src/domain/pricing.test.ts` finished with 38/38 passing.
5. Full suite GREEN: 46/46 tests passing across 4 test files.

## Validator output

Command: `npm run validate:data`

```text
provider azure: 7 offers, 6 free-tier records
provider gcp: 7 offers, 6 free-tier records
provider aws: 7 offers, 4 free-tier records
provider hetzner: 2 offers, 0 free-tier records
provider oracle: 2 offers, 5 free-tier records
provider cloudflare: 2 offers, 0 free-tier records
provider digitalocean: 2 offers, 0 free-tier records
provider vultr: 2 offers, 0 free-tier records
category compute: 8 offers
category gpu-ai: 3 offers
category object-storage: 7 offers
category managed-database: 3 offers
category serverless: 4 offers
category cdn-network: 3 offers
category kubernetes: 3 offers
catalog valid: 8 providers, 31 offers, 21 free-tier records, 56 sources
```

The validator checks strict schema parsing, duplicate IDs, future/stale dates against a deterministic 2026-08-13 clock, HTTPS, provider/source ownership and source kind, purchase and region evidence, positive paid components, exclusion notes, major/alternative coverage, free-tier minimums, source foreign keys, health status, and the dated ECB EUR/USD rate.

## URL validation

Method: Node's live `fetch` issued GET requests with redirect following, a browser-like user agent, a 30-second abort timeout, and batches of eight; response bodies were cancelled after the status was known. Success was defined as HTTP 2xx or 3xx. The complete post-review run returned `56/56 resolved`; every stored source returned HTTP 200. The first run before two self-review sources were added was also clean at `54/54`.

## Independent manual recomputations

The engine was run without free-tier eligibility so the paid line items could be compared directly with arithmetic:

| Provider/example | Manual calculation | Engine result |
|---|---:|---:|
| Azure B2s, small-web-app | `730 × 0.048` | `35.04 USD` |
| GCP Cloud Run requests, api-backend | `10 million × 0.40` | `4.00 USD` |
| AWS Lightsail Linux bundle, small-web-app | `1 × flat 5.00` | `5.00 USD` |
| Hetzner CX23, small-web-app | `min(730 × 0.0088 EUR, 5.49 EUR) × 1.1534` | `6.332166 USD` |

The Hetzner pre-cap hourly result is EUR `6.424`, so the EUR `5.49` monthly cap is correctly selected before ECB conversion. The direct arithmetic `5.49 × 1.1534` also produced `6.332166`.

Additional catalog spot checks:

- AWS SageMaker catalog returned Frankfurt, `ml.g5.xlarge-Training`, 4 vCPU, 16 GiB, one GPU, USD `1.7600000000` per hour for the recorded SKU.
- Oracle price JSON returned positive post-free-band prices of USD `0.01` per A1 OCPU-hour, USD `0.0015` per GB-hour, and USD `0.0255` per GB-month of Object Storage after the first 10 GB.
- ECB CSV returned the exact 2026-08-13 observation `1.1534`.
- Vultr plan API returned 1 vCPU, 1024 MB RAM, 25 GB SSD, 1024 GB bandwidth, USD `0.007` hourly, USD `5` monthly, `deploy_ondemand: true`, and location `fra` for `vc2-1c-1gb`.

## Final verification results

- `npm run validate:data`: pass
- `npm run test -- src/data/catalog.test.ts src/domain/pricing.test.ts`: pass, 38/38
- `npm run test`: pass, 46/46 across 4 files
- `npm run lint`: pass, no output/errors
- `npm run build`: pass; TypeScript build and Vite production build completed
- `git diff --check`: pass
- JSON parse check for every catalog JSON file: pass
- Live official URL validation: pass, 56/56 HTTP 200

## Self-review and concerns

- The catalog is a dated source-controlled snapshot, not a quote. Providers can change rates, free-tier rules, product availability, and payment eligibility after 2026-08-13.
- Taxes/VAT, currency conversion charged by a card issuer, support plans, and the exclusion named in each offer note can materially change a real invoice. The price engine is intentionally incomplete when a component is not recorded.
- GCP's official pricing pages preserve the selected region in page state rather than in the URL. The Belgium/on-demand selections and arithmetic are recorded in offer notes, but a future verifier must repeat the selector steps.
- Oracle's current Always Free documentation states 1,500 A1 OCPU-hours and 9,000 GB-hours, while the 2026-08-06 machine-readable price list exposes zero-price ranges to 3,000 and 18,000 for the same part numbers. The conservative free-tier entries use the dedicated Always Free documentation (1,500/9,000); the paid representative uses only the explicit positive post-free-band list rates. This official-source discrepancy should be revisited on refresh.
- Hetzner is the only EUR provider in the accepted offers; original EUR hourly values and monthly caps are preserved, and conversion uses only the dated ECB rate.
- Alternative coverage requires two offers, not two distinct categories. Hetzner therefore has two independently sourced compute plans; this satisfies the written rule but is less category-diverse than the other alternatives.
- No unverifiable offer was filled with an estimate. This reduces breadth for alternatives but protects the factual backbone requested by the task.
