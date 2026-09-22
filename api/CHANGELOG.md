# Changelog

## [0.6.1](https://github.com/alliance-genome/agr_pavi/compare/api-v0.6.0...api-v0.6.1) (2026-09-22)


### Bug Fixes

* **api:** patch orphaned security deps (anyio, urllib3, python-multipart) ([#982](https://github.com/alliance-genome/agr_pavi/issues/982)) ([f377637](https://github.com/alliance-genome/agr_pavi/commit/f3776377091a124fcc20398413e2e914cf8132fd))
* **deps:** bump urllib3 2.6.3 -&gt; 2.8.0 across remaining manifests ([#985](https://github.com/alliance-genome/agr_pavi/issues/985)) ([f4e8d62](https://github.com/alliance-genome/agr_pavi/commit/f4e8d62e7bfb86eaacd4b6829357217d355d6c0a))

## [0.6.0](https://github.com/alliance-genome/agr_pavi/compare/api-v0.5.0...api-v0.6.0) (2026-09-21)


### Features

* export a finished job as JSON, FASTA, or variants CSV ([f76231b](https://github.com/alliance-genome/agr_pavi/commit/f76231be9b7b7abaf37ca072cfb0997696b0f5a7))
* surface component versions (WebUI footer + API /health) ([8e3e291](https://github.com/alliance-genome/agr_pavi/commit/8e3e2914a15a1468bf289ac34a5055fcf58c0b07))


### Bug Fixes

* **ci:** green the code-checks debt ([#927](https://github.com/alliance-genome/agr_pavi/issues/927)) ([b73159b](https://github.com/alliance-genome/agr_pavi/commit/b73159b7b2377dc5a151952ff1ebc9b6147131be))
* **ci:** green the code-checks debt tracked in [#927](https://github.com/alliance-genome/agr_pavi/issues/927) ([2394e35](https://github.com/alliance-genome/agr_pavi/commit/2394e3594a6cdb5f719537960d068af62da345b0))
* **ci:** ignore E203 (ruff slice conflict) + correct misplaced flake8 noqa ([2fc16f4](https://github.com/alliance-genome/agr_pavi/commit/2fc16f4f01e60fc959fa21c7f22646e62dafcc73))
