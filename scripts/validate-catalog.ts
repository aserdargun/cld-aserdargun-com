import { providerIds, serviceCategories, type Catalog } from '../src/domain/catalog'
import { loadCatalog } from '../src/data/catalog'
import { validateCatalog } from '../src/data/validation'

let catalog: Catalog
try {
  catalog = loadCatalog()
} catch (error) {
  const message = error instanceof Error ? error.message.replaceAll('\n', ' ') : String(error)
  console.error(`FAIL schema parse: ${message}`)
  process.exit(1)
}

const failures = validateCatalog(catalog)
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`)
  process.exit(1)
}

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
