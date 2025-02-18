# PAVI Web UI
This subdirectory contains all code and configs for the PAVI web UI component.

The web UI code is written in typescript, so follows the [general dependency management](/README.md#dependency-management) and [javascript/typescript](/README.md#javascript-components) PAVI coding guidelines.

It is built using the [Next.js](https://nextjs.org/), a [react](https://react.dev/) framework that enables usage of both client and server components, server-side caching and much more.

This project was bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/v14.2.3/packages/create-next-app).

## Testing
The [Makefile](./Makefile) contains several targets to simplify local testing and development.

Before running the local development web server, ensure the [API is running locally](../api/README.md#development)
 or update the `PAVI_API_BASE_URL` variable in the Makefile to point to an accessible PAVI API URL.

To run the local development web server:
```bash
make run-server-dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

### E2E testing
The [cypress](./cypress/) subdirectory contains the specs and configurations to run end-to-end testing on PAVI.
To run the E2E testing locally in interactive mode, run:
```bash
make run-e2e-tests-dev
```

While useful for troubleshooting failing test, these interactive mode does not run the visual regression testing.

Visual regression testing is done through [cypress-image-diff](https://github.com/haim-io/cypress-image-diff),
a tool that can take snapshots of (parts of) the user interface and compare them to the expected baseline.
However, these test require a uniform system to run in order to generate consistent results.
System differences at client level can result in small differences in rendering, which results in small visual differences
that fail the visual regression testing. As a consequence, the only reliable way of doing consistent visual regression testing
is through the `agr_pavi/cypress_testing` container. This container is built to contain all required cypress configuration,
but none of the test specification files or application code. The application is to be run externally through the respective containers,
while the test specification files are to be mounted in to the cypress_testing container.

To run the E2E tests including the visual regression testing, run cypress through the following command:
```bash
make run-e2e-tests
```

When any of the visual regression tests fail, cypress will stop further testing and fail.
To generate an interactive report of the failing visual regression test, run below command:
```bash
make open-cypress-image-diff-html-report
```
This will open an interactive interface at http://localhost:6868 for inspecting the difference
between the baseline and the actually rendered interface and can be used to update the baseline when needed.

If the difference in a visual regression test is deemed acceptable, update the baseline
and run the e2e testing again until all tests pass.

For more info on how to use the cypress-image-diff HTML report,
see [the README](https://github.com/haim-io/cypress-image-diff#readme)
or [the cypress-image-diff-html-report repository](https://github.com/kien-ht/cypress-image-diff-html-report).


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

or check out [the Next.js GitHub repository](https://github.com/vercel/next.js/).

