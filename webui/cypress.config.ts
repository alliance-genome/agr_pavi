import { defineConfig } from "cypress";
import getCompareSnapshotsPlugin from 'cypress-image-diff-js/plugin';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return getCompareSnapshotsPlugin(on, config);
    },
    baseUrl: 'http://localhost:3000',
    retries: {
      "runMode": 1,
      "openMode": 0
    },
    supportFile: 'cypress/support/e2e.ts',
    // Testing at 1080p resolution (full HD)
    viewportHeight: 1080,
    viewportWidth: 1920,
  },
});
