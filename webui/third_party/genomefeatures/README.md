# genomefeatures

[![npm package][npm-badge]][npm]

[![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/genomefeatures/push.yml?branch=main)](https://github.com/GMOD/genomefeatures/actions?query=branch%3Amain+workflow%3APush+)

[npm-badge]: https://img.shields.io/npm/v/genomefeatures.png?style=flat-square
[npm]: https://www.npmjs.com/package/genomefeatures

# Screenshot

![Example 1](images/ExampleIsoform1.png)

## Demo

Demo https://gmod.org/genomefeatures/

Storybook https://gmod.org/genomefeatures/storybook

# Instructions

Install from NPM

```bash
yarn add genomefeatures
```

Or see see [example/index.html](example/index.html) for CDN import style usage,
e.g.

## Loading data

### Static access pattern - Accessing JBrowse NCList files and VCF tabix files

In the old days, this component required a WebApollo aka Apollo 2 server running
to work (see [LEGACY.md](LEGACY.md)) but after the refactor, we can now fetch
files from static files like JBrowse 1 NCList and VCF tabix files. This means
you do not need a complex apollo deployment to use this component: just some
static files

```typescript
import {
  fetchNCListData,
  fetchTabixVcfData,
  parseLocString,
  GenomeFeatureViewer,
} from 'genomefeatures'

// if your bundler let's you import CSS, you can do this, otherwise see CDN usage example
import 'genomefeatures/style.css'

const locString = '2L:130639..135911'
const genome = 'fly'

const vcfTabixUrl =
  'https://s3.amazonaws.com/agrjbrowse/VCF/7.0.0/fly-latest.vcf.gz'
const ncListUrlTemplate =
  'https://s3.amazonaws.com/agrjbrowse/docker/7.0.0/FlyBase/fruitfly/tracks/All_Genes/{refseq}/trackData.jsonz'

const region = parseLocString(locString)
const trackData = await fetchNCListData({
  region,
  urlTemplate: ncListUrlTemplate,
})

const variantData = await fetchTabixVcfData({
  url: vcfTabixUrl,
  region,
})

const gfc = new GenomeFeatureViewer(
  {
    region,
    genome,
    tracks: [
      {
        type: 'ISOFORM_EMBEDDED_VARIANT',
        trackData,
        variantData,
      },
    ],
  },
  `#svgelement`,
  900,
  500,
)
```

And then in your HTML

```html
<svg id="svgelement"></svg>
```

This could likely also be wired up with @gmod/gff and @gmod/tabix to fetch from
a GFF3 file backend, but NCList was what was available

## Developers

```bash
git clone git@github.com:GMOD/genomefeatures
yarn dev # vite demo
yarn storybook # storybook examples
```

## Notes

Originally called https://github.com/GMOD/GenomeFeatureComponent

Created by Nathan Dunn (@nathandunn), used by Alliance of Genome Resources

Updated in 2025 by Colin Diesh (@cmdcolin) to add ability to fetch from static
files

See also https://github.com/GMOD/react-genomefeatures
