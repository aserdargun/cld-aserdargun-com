import { providerIds, serviceCategories, type Catalog } from '../src/domain/catalog'
import { loadCatalog, verificationWindowDays } from '../src/data/catalog'
import { validateCatalog, validateCatalogFreshness } from '../src/data/validation'

let catalog: Catalog
try {
  catalog = loadCatalog()
} catch (error) {
  const message = error instanceof Error ? error.message.replaceAll('\n', ' ') : String(error)
  console.error(`FAIL schema parse: ${message}`)
  process.exit(1)
}

// The snapshot gate proves the dated research photo is internally consistent; the
// freshness gate proves it is still inside the documented window on the real clock.
const today = new Date()
const failures = [...validateCatalog(catalog), ...validateCatalogFreshness(catalog, today)]
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`)
  process.exit(1)
}

console.log(
  `catalog fresh as of ${today.toISOString().slice(0, 10)}: every offer, free-tier and exchange-rate record is within the ${verificationWindowDays}-day verification window`,
)

for (const providerId of providerIds) {
  const offerCount = catalog.offers.filter((offer) => offer.providerId === providerId).length
  const freeTierCount = catalog.freeTiers.filter((freeTier) => freeTier.providerId === providerId).length
  console.log(`provider ${providerId}: ${offerCount} offers, ${freeTierCount} free-tier records`)
}
for (const category of serviceCategories) {
  const count = catalog.offers.filter((offer) => offer.category === category).length
  console.log(`category ${category}: ${count} offers`)
}
console.log(`catalog valid: ${catalog.providers.length} providers, ${catalog.offers.length} offers, ${catalog.freeTiers.length} free-tier records, ${catalog.sources.length} sources`)
