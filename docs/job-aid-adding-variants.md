# Job Aid — Adding a Specific Variant to a PAVI Alignment

**Audience:** PAVI users (Submit page)
**Task:** Include a particular variant/allele in a protein alignment — including variants that don't show up in the default list.

---

## The one thing to remember

> To add a specific variant, paste its **full HGVS** into the **Alleles** box —
> e.g. `NC_000068.8:g.105521966G>T` — **not** just the position number.

---

## Steps

1. On the **Submit** page, choose your **gene** (species + symbol or ID).
2. *(Optional)* Select the **transcript(s)** you want to align.
3. Click the **Alleles (optional)** box. PAVI loads that gene's variants.
4. Add the variant you want, one of two ways:
   - **You have the HGVS** (from the Alliance gene page — see below): **paste the full HGVS string**. PAVI looks it up and adds it. You'll see **"Added — select it below."**
   - **You want to browse:** type part of an allele name/symbol; matching variants for that gene are pulled in.
5. **Tick the checkbox** for the variant(s) you want, then **Submit**.

Added variants are submitted exactly like listed ones — no extra steps.

---

## Where to get the HGVS

On the Alliance gene page (`alliancegenome.org/gene/…`), open the **"Alleles and Variants"** section. Each variant's genomic HGVS is shown — copy the **whole** string, including the `NC_…:g.` prefix and the change (e.g. `G>T`):

```
NC_000068.8:g.105521966G>T
```

---

## Why a variant might not already be in the list

For genes with many variants, PAVI initially loads only about the **first 100**, ordered by genomic position. A variant beyond that simply won't appear in the list until you **look it up by its HGVS**. This is expected — pasting the HGVS pulls it in regardless of position.

---

## Common pitfalls

| What you did | What happens | Fix |
|---|---|---|
| Typed just the **position number** (`105521966`) | PAVI can't resolve a variant from a position alone; it prompts *"Enter the full HGVS…"* | Paste the complete HGVS (accession + change), e.g. `NC_000068.8:g.105521966G>T` |
| Pasted an HGVS for a **different gene** | *"No match for this gene"* | Confirm you selected the correct gene **and species**, then paste again |
| HGVS is **partial or reformatted** | No match | Copy it **verbatim** from the Alliance gene page — don't drop the `NC_…:g.` prefix or the `>` |
| Variant added but you don't see it | It's in the list but unchecked | Scroll/filter to it and **tick its checkbox**; a looked-up variant stays visible even with a transcript filter active |

---

## Quick decision guide

```
Do you know the exact variant you want?
├─ Yes, and I have its HGVS ........ Paste the full HGVS  → "Added — select it below"
├─ Yes, but only its position ...... Look up its full HGVS on the Alliance gene page, then paste
└─ No, I want to browse ............ Type part of an allele name/symbol to pull in matches
```

---

*Related: the Alliance gene page "Alleles and Variants" widget is the same data source; the transcript models shown in PAVI's **View transcripts** dialog come from the same Alliance release.*
