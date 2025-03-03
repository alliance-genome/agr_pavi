import { defineConfig } from "cypress";
import getCompareSnapshotsPlugin from 'cypress-image-diff-js/plugin';

type compareSnapshotResult = number | undefined;
type snapshotResultType = "passed" | "failed";
const snapshotResultMap: Map<snapshotResultType, string[]> = new Map<snapshotResultType, string[]>();
snapshotResultMap.set("passed", []);
snapshotResultMap.set("failed", []);

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Registering custom tasks that can be called as cy.task('taskName', ...)
      on('task', {
        // cy.task('storeSnapshotResult', ...)
        storeSnapshotResult({id, result}: {id: string, result: compareSnapshotResult}) {
          const snapshotResult = result === 0 ? "passed" : "failed";

          console.log(`storing snapshot ${id} with result ${result} as ${snapshotResult}`);
          snapshotResultMap.get(snapshotResult)?.push(id)

          return null
        },
        // cy.task('errorOnSnapshotFailures', ...)
        errorOnSnapshotFailures() {
          console.log(`Number of snapshots stored (success/failure): ${snapshotResultMap.get("passed")?.length}/${snapshotResultMap.get("failed")?.length}`);
          if (snapshotResultMap.get("failed")?.length) {
            const failedCount = snapshotResultMap.get("failed")?.length;
            const totalCount = (snapshotResultMap.get("failed") || []).length + (snapshotResultMap.get("passed") || []).length;
            throw new Error(`Snapshot test(s) failed (${failedCount} of total ${totalCount}): ${snapshotResultMap.get("failed")?.join(", ")}`);
          }

          return null
        },
        clearSnapshotResults() {
          console.log("Clearing snapshot results");

          snapshotResultMap.clear();
          snapshotResultMap.set("passed", []);
          snapshotResultMap.set("failed", []);

          return null
        }
      });
      return getCompareSnapshotsPlugin(on, config);
    },
    baseUrl: 'http://localhost:3000',
    retries: {
      "runMode": 0,
      "openMode": 0
    },
    supportFile: 'cypress/support/e2e.ts',
    // Testing at 1080p resolution (full HD)
    viewportHeight: 1080,
    viewportWidth: 1920,
  },
});
