// Re-export of `catalog.json` as a typed module so consumers (WebUI,
// future Playwright suite) get compile-time guarantees without
// re-encoding the dataset in TypeScript.

import catalogJson from './catalog.json'
import type { ExampleCatalog } from './types'

export const exampleCatalog: ExampleCatalog = catalogJson as ExampleCatalog

export * from './types'
