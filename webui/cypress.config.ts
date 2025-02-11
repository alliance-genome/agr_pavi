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
    supportFile: 'cypress/support/e2e.ts'
  },
});
