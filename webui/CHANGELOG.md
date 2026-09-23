# Changelog

## [0.8.0](https://github.com/alliance-genome/agr_pavi/compare/webui-v0.7.0...webui-v0.8.0) (2026-09-23)


### Features

* **webui:** preselect and label the canonical transcript for searched genes ([#1005](https://github.com/alliance-genome/agr_pavi/issues/1005)) ([372a5df](https://github.com/alliance-genome/agr_pavi/commit/372a5df26b8edbb7cbc0480a30bae3703b57eaa2))

## [0.7.0](https://github.com/alliance-genome/agr_pavi/compare/webui-v0.6.3...webui-v0.7.0) (2026-09-23)


### Features

* **webui:** preselect the MANE Select transcript for human genes ([#1004](https://github.com/alliance-genome/agr_pavi/issues/1004)) ([d8272ea](https://github.com/alliance-genome/agr_pavi/commit/d8272eaa76812e62cd162cf7df4ae24812551e4c))


### Bug Fixes

* **webui:** build and test the webui from webui/ alone; repair Cypress ([#999](https://github.com/alliance-genome/agr_pavi/issues/999)) ([70c6acf](https://github.com/alliance-genome/agr_pavi/commit/70c6acfd0fdd859a5b24cb91d92f8160902a4fab))

## [0.6.3](https://github.com/alliance-genome/agr_pavi/compare/webui-v0.6.2...webui-v0.6.3) (2026-09-22)


### Bug Fixes

* **ci:** repair lock-comment size limit, post-merge deploy and three check failures ([#995](https://github.com/alliance-genome/agr_pavi/issues/995)) ([74e0fdd](https://github.com/alliance-genome/agr_pavi/commit/74e0fdd1e823dd7c72c122f05b8cef6d0a22580f))

## [0.6.2](https://github.com/alliance-genome/agr_pavi/compare/webui-v0.6.1...webui-v0.6.2) (2026-09-22)


### Bug Fixes

* **deps:** patch remaining fixable Dependabot alerts (round 2) ([#992](https://github.com/alliance-genome/agr_pavi/issues/992)) ([441d557](https://github.com/alliance-genome/agr_pavi/commit/441d5579fcfc542781ad6610b0613144cfe6353f))
* **webui:** fully hide ortholog alignment and bulk upload in production ([#989](https://github.com/alliance-genome/agr_pavi/issues/989)) ([cda5f90](https://github.com/alliance-genome/agr_pavi/commit/cda5f90448b38493bf1d6270697613a712aae197))
* **webui:** preselect the canonical protein-coding transcript ([#990](https://github.com/alliance-genome/agr_pavi/issues/990)) ([a5a8520](https://github.com/alliance-genome/agr_pavi/commit/a5a852029376a8cc58ff04f3d6e8a821e993f259))

## [0.6.1](https://github.com/alliance-genome/agr_pavi/compare/webui-v0.6.0...webui-v0.6.1) (2026-09-22)


### Bug Fixes

* **ci:** green the code-checks debt ([#927](https://github.com/alliance-genome/agr_pavi/issues/927)) ([b73159b](https://github.com/alliance-genome/agr_pavi/commit/b73159b7b2377dc5a151952ff1ebc9b6147131be))
* **ci:** green the code-checks debt tracked in [#927](https://github.com/alliance-genome/agr_pavi/issues/927) ([2394e35](https://github.com/alliance-genome/agr_pavi/commit/2394e3594a6cdb5f719537960d068af62da345b0))
* **deps:** bump urllib3 2.6.3 -&gt; 2.8.0 across remaining manifests ([#985](https://github.com/alliance-genome/agr_pavi/issues/985)) ([f4e8d62](https://github.com/alliance-genome/agr_pavi/commit/f4e8d62e7bfb86eaacd4b6829357217d355d6c0a))
* **webui-infra:** make amplify-alpha an optional extra so the lock resolves ([#988](https://github.com/alliance-genome/agr_pavi/issues/988)) ([185eec5](https://github.com/alliance-genome/agr_pavi/commit/185eec59a902eed329668f468f40d57d6e6106a1)), closes [#927](https://github.com/alliance-genome/agr_pavi/issues/927)
* **webui:** override vulnerable transitive deps (2 critical, 10 high) ([#986](https://github.com/alliance-genome/agr_pavi/issues/986)) ([7c4c380](https://github.com/alliance-genome/agr_pavi/commit/7c4c3801d0fde337edff52027ec5ab23f9fadc05))

## [0.6.0](https://github.com/alliance-genome/agr_pavi/compare/webui-v0.5.0...webui-v0.6.0) (2026-09-21)


### Features

* export a finished job as JSON, FASTA, or variants CSV ([f76231b](https://github.com/alliance-genome/agr_pavi/commit/f76231be9b7b7abaf37ca072cfb0997696b0f5a7))
* surface component versions (WebUI footer + API /health) ([8e3e291](https://github.com/alliance-genome/agr_pavi/commit/8e3e2914a15a1468bf289ac34a5055fcf58c0b07))
* **webui:** /submit-bulk page wiring upload to the alignment form ([d0b2cc4](https://github.com/alliance-genome/agr_pavi/commit/d0b2cc4416ab528324de203bdde6f04c96124ff8))
* **webui:** add AlleleSource to AlleleInfo, tag gene-fetched alleles ([25786f8](https://github.com/alliance-genome/agr_pavi/commit/25786f8fa3a1f49a0416f1a0a4d0af58257e8291))
* **webui:** add best-effort searchVariants server action ([6627153](https://github.com/alliance-genome/agr_pavi/commit/66271537a5f714de4ba6b2a721a5b661eaae87b4))
* **webui:** add GenomeFeatureView client renderer ([ad6a21e](https://github.com/alliance-genome/agr_pavi/commit/ad6a21ec890b4d060c1090df52f535336660977d))
* **webui:** add genomic HGVS detector for allele search ([d064028](https://github.com/alliance-genome/agr_pavi/commit/d0640284cba9f5ec266ce0bddfec484ae4f83911))
* **webui:** add in-app User Guide at /help/guide ([807c483](https://github.com/alliance-genome/agr_pavi/commit/807c483be363765e9b1a8858c61197c13f821cee))
* **webui:** add lookupVariantByHgvs server action ([b4ef659](https://github.com/alliance-genome/agr_pavi/commit/b4ef65928dde5c590ac3611c8c308575b5383ee1))
* **webui:** add pure track-config builders for transcript viewer ([68b5d90](https://github.com/alliance-genome/agr_pavi/commit/68b5d9054678bc1a431bb159ab19b0a72b6e9ae6))
* **webui:** add TranscriptViewerDialog wrapping the genome feature view ([97a8e61](https://github.com/alliance-genome/agr_pavi/commit/97a8e61aeab957832a8f8ed6ed25ad2a862e0919))
* **webui:** add View transcripts button to alignment entry ([a397f69](https://github.com/alliance-genome/agr_pavi/commit/a397f699694ccc5129a504a05209edc87c7656a0))
* **webui:** bulk upload template + skipped-rows report ([c19825d](https://github.com/alliance-genome/agr_pavi/commit/c19825de05bc0446f0e432f4601ee59a8fde3c19))
* **webui:** colour the transcript viewer isoform models ([1f825b0](https://github.com/alliance-genome/agr_pavi/commit/1f825b0bb05bdb4d5f0dff54b31413711b97d7ef))
* **webui:** declutter the bulk-upload page ([e263301](https://github.com/alliance-genome/agr_pavi/commit/e263301a8d8b60e503feab170fcc6a8b53270382))
* **webui:** edit a submitted query instead of starting over ([13d9f06](https://github.com/alliance-genome/agr_pavi/commit/13d9f06ed768f92e8f4751e7f25ebe09c2caabcf))
* **webui:** env-driven basePath support for serving under /pavi ([e152420](https://github.com/alliance-genome/agr_pavi/commit/e1524203a01b6006117f2313824b8d52ca93df15))
* **webui:** environment corner ribbon (BETA/DEV) ([7faa97c](https://github.com/alliance-genome/agr_pavi/commit/7faa97c04172800b10d0a754690c6e655c614ad1))
* **webui:** fetch transcript models from tabix GFF instead of NCList ([7ef65d3](https://github.com/alliance-genome/agr_pavi/commit/7ef65d3008ccb2768069baa70239c1026c5ead67))
* **webui:** hint users to enter full HGVS when a bare position is typed ([f72b196](https://github.com/alliance-genome/agr_pavi/commit/f72b19671a2b93e351c959d2ba8c1e536ee11d76))
* **webui:** let JobSubmitForm accept pre-filled initialGenes ([00d8d63](https://github.com/alliance-genome/agr_pavi/commit/00d8d6347ee40a1609913be20b76cb4f1e2d2040))
* **webui:** link the User Guide from the home page CTA ([816e8a6](https://github.com/alliance-genome/agr_pavi/commit/816e8a684f01a9ab06ad4c1a51e452fe792572b6))
* **webui:** look up variants by allele name in the Alleles box ([97a4f09](https://github.com/alliance-genome/agr_pavi/commit/97a4f09dbacba7491ba7911dde5058e3a636029d))
* **webui:** merge searched alleles into alleleList, preserve selection on append ([565b330](https://github.com/alliance-genome/agr_pavi/commit/565b33060252402e8d064a8afbd88004f6bb6231))
* **webui:** parse bulk gene-list files (CSV/TSV/xlsx) ([4f37144](https://github.com/alliance-genome/agr_pavi/commit/4f371447ebd6bf3a8d3561c005b03bf24ce667af))
* **webui:** pin zebrafish to GRCz11 (9.0.0) tracks with an assembly disclaimer ([8f25ecc](https://github.com/alliance-genome/agr_pavi/commit/8f25ecc65e3cb7ed2e713099cae866b3c4be3693))
* **webui:** pre-select transcripts by name via initialTranscriptNames ([3f6b45f](https://github.com/alliance-genome/agr_pavi/commit/3f6b45f1bf42e0ae96d0a4e3a3f8ea3017c02b33))
* **webui:** publication-quality SVG figure export for alignments ([a3fc316](https://github.com/alliance-genome/agr_pavi/commit/a3fc3162710579bcb27925be6fa11e1c389d89dc))
* **webui:** replace homepage feature icons with branded SVG set ([1d85e38](https://github.com/alliance-genome/agr_pavi/commit/1d85e38217779d8c568b0a856c73dc6648f7e211))
* **webui:** resolve bulk rows to gene entries (best-effort) ([4a2bf25](https://github.com/alliance-genome/agr_pavi/commit/4a2bf25686e94c1ed9b6d06470fa90c261ab8048))
* **webui:** search/paste a variant by HGVS in the Alleles box ([ab218cc](https://github.com/alliance-genome/agr_pavi/commit/ab218cc12f5723947720249bcbeec4244088b0e0))
* **webui:** show a clear notice when a gene has no transcript models ([291c12a](https://github.com/alliance-genome/agr_pavi/commit/291c12a6b4316a8c4242d4e2349c6b35e23008b7))
* **webui:** show all isoforms in the transcript viewer (vendored genomefeatures) ([aec3582](https://github.com/alliance-genome/agr_pavi/commit/aec358205ce810eeeb6cc56f2ff74c3ef2b25ac2))


### Bug Fixes

* **ci:** ignore E203 (ruff slice conflict) + correct misplaced flake8 noqa ([2fc16f4](https://github.com/alliance-genome/agr_pavi/commit/2fc16f4f01e60fc959fa21c7f22646e62dafcc73))
* **webui:** add spacing between coordinate axis and first transcript ([dd53069](https://github.com/alliance-genome/agr_pavi/commit/dd53069e96f229eb10e2a05d3d0d80a742e4b92f))
* **webui:** add spacing between Help tab icons and their labels ([00260cd](https://github.com/alliance-genome/agr_pavi/commit/00260cdd0344bbd2c1c68fcb05ce8a2d7304981f))
* **webui:** an explicitly searched allele overrides the transcript filter ([368a977](https://github.com/alliance-genome/agr_pavi/commit/368a9772ec8810096ad674b407970c10e6e1c0f0))
* **webui:** auto-dismiss the allele search status message ([0797e26](https://github.com/alliance-genome/agr_pavi/commit/0797e268662d43b4514a6497e76bf2953001efd7))
* **webui:** don't pin zebrafish to GRCz11 tracks (assembly mismatch) ([36ba241](https://github.com/alliance-genome/agr_pavi/commit/36ba241ae33003395c1d0a78e7a8b127983290f8))
* **webui:** guard against unmount during genomefeatures dynamic import ([a0a5e68](https://github.com/alliance-genome/agr_pavi/commit/a0a5e687dc2ade350d7506ab6f1ca46055d32b07))
* **webui:** keep MOCK_API off in production ([398a5da](https://github.com/alliance-genome/agr_pavi/commit/398a5da92ce53f405eee64afb05895d887f01459))
* **webui:** keep user-added variants visible past the allele filters ([296f2e4](https://github.com/alliance-genome/agr_pavi/commit/296f2e41461b8b07c415f85047fd90758108f1ce))
* **webui:** make mock-mode results page render (visual testing) ([e704419](https://github.com/alliance-genome/agr_pavi/commit/e704419378ebb85e392137a8dc25595c9f8cd1f8))
* **webui:** repair strict typecheck for CI ([bc1c042](https://github.com/alliance-genome/agr_pavi/commit/bc1c04270b9d4ca6408c95243059d2821614ab73))
* **webui:** resolve gene from initialGeneId so transcripts/alleles load ([bf830f6](https://github.com/alliance-genome/agr_pavi/commit/bf830f601c12b8596928a64e76aee4b3b32c316a))
* **webui:** show pre-selected alleles that the transcript filter hides ([20aa148](https://github.com/alliance-genome/agr_pavi/commit/20aa148931acaf437a3299da7df69fbb2178012c))
* **webui:** species-scoped gene search + guard bulk resolve errors ([594f309](https://github.com/alliance-genome/agr_pavi/commit/594f309f2577c706d8e6dbaabc2724f3afe4b3fd))
* **webui:** stop service worker serving stale pages (breaks Server Actions) ([81e486c](https://github.com/alliance-genome/agr_pavi/commit/81e486c1559780cc3592afcffb0546abe660df27))
* **webui:** strip dead JBrowse-1 "full view" links from transcript viewer ([bb5d8fa](https://github.com/alliance-genome/agr_pavi/commit/bb5d8fae50df496de5102878b504ec0be3d734a2))
* **webui:** tidy footer version display (strip component prefix, single v) ([984b066](https://github.com/alliance-genome/agr_pavi/commit/984b066cefa7b38b401164a95dad4837ffe982e2))
* **webui:** truncate long allele names in the Alleles dropdown ([0280688](https://github.com/alliance-genome/agr_pavi/commit/0280688d09e421e3e8da6faca62563772106b30a))
* **webui:** vendor species JBrowse config; pin zebrafish to a working release ([02e9870](https://github.com/alliance-genome/agr_pavi/commit/02e9870bbf23aacab42f6a6f77b476a7d538710d))
* **webui:** whitelist Alliance edge hosts for Server Actions ([c92dfe1](https://github.com/alliance-genome/agr_pavi/commit/c92dfe1f5fee2b74c16509cf81153856f6eff901))
* **webui:** xlsx test coverage + physical lineNumber for blank lines ([12524f8](https://github.com/alliance-genome/agr_pavi/commit/12524f8ded80b6d509aa2f4dd82e5aff02cb641b))
