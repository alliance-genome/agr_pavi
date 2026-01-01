# Variant Working Group Reference

This document contains reference information, useful links, and historical context from the Alliance Variant Working Group relevant to PAVI development.

## Useful Links

### Variant File Specifications
- **JSON from DQM**: [Variant JSON specifications]
- **Table format**: [Variant table format]
- **Text format with comments**: [Text format]
- **Examples**: Available in Alliance Drive
  - `variation.yaml`
  - `variantConsequence.yaml` (model for VEP pipeline output)

### Mockups and Design Documents
- Updated sequence viewer mockup
- GenomeFeatureComponent + Browser w/ controls
- JBrowse integration mockups
- JBrowse pop-up design
- Allele table design

### Reference Documentation
- **Glossary**: Alliance terminology definitions
- **Comparison with other groups**: Feature comparison document
- **Discussions archive**: Working group discussions
- **Charter**: WG project charter
- **Project plan**: Implementation roadmap
- **Use cases**: Documented user scenarios

### PAVI Resources
- **Kanban Board**: https://agr-jira.atlassian.net/jira/software/c/projects/KANBAN/boards/69/backlog
- **PI Decision Board**: https://agr-jira.atlassian.net/browse/DECISION-16
- **Live Application**: https://pavi.alliancegenome.org/submit (requires Alliance VPN)

## Finding Alliance Data Files

### How to Find Files (Release 3.0)

1. Go to: https://fms.alliancegenome.org/api/snapshot/release/3.0.0
2. Search the page for your file of interest (Ctrl+F)
   - Example: `VEPGENE`
   - Example: `VEPTRANSCRIPT`
3. Get the `s3Path` value
   - Example: `3.0.0/VEPTRANSCRIPT/ZFIN/VEPTRANSCRIPT_ZFIN_0.txt`
4. Download from: https://download.alliancegenome.org/ + s3Path
   - Example: https://download.alliancegenome.org/3.0.0/VEPTRANSCRIPT/ZFIN/VEPTRANSCRIPT_ZFIN_0.txt

## PAVI Development Timeline (from WG Meeting Notes)

### October 2024
- Gene field updated with autocomplete and symbol support
- Allele field matches on any part of ID/symbol
- Result page reports translation failures (e.g., variant affects start codon)
- Manuel's last meeting - handoff planning began

### September 2024
- PAVI available at http://pavi.alliancegenome.org/ (VPN required)
- Fixed issue with same transcript in multiple records
- UI maintains input order (was alphabetical)
- ZFIN gene issues identified (missing strand info at gene level)
- MVP discussion: variant integration is key differentiator

### August 2024
- Variant position icons implemented
- Overview bar with zoom functionality
- Deletion visualization with padding base
- Question: Mark variant position in reference sequence? (Consensus: could be confusing)

### July 2024
- Version management system work
- React version conflicts with JBrowse/Scott Cain's transcript selector
- pavi.alliancegenome.org/api documentation endpoint

### June 2024
- GitHub auto-update for security dependencies
- UI decisions: TypeScript, PrimeReact, Next.js
- KANBAN-582: Skeleton page for job submissions

### April 2024
- Backend work for embedding variants
- Multiple variants can be inserted into same transcript
- Naming convention discussions for alignment rows
- Edge cases: exon deletions, start/stop codon loss

### March 2024
- Transcript source discussion (genome-derived vs RefSeq)
- Decision: Use genome-derived for first iteration
- Future: User option to choose transcript source

### February 2024
- Manuel started work on PAVI
- Backlog created on dedicated KANBAN board
- Roadmap established (no timeline promises)

### 2023
- Requirements gathering
- LinkML model discussions
- Variant curation software planning

### September 2022
- Meeting with UniProtKB team
- Clustal Omega and Nightingale components discussion
- Initial mockups presented

## Key Technical Decisions

### Transcript Sources
- **First iteration**: Use reference genome-derived transcript sequences
- **Future**: Option to use RefSeq transcripts (VEP uses RefSeq)
- **Rationale**: VEP reports positions relative to RefSeq transcripts

### Translation Handling
- If CDS info available: Use CDS-guided translation
- If no CDS: Find longest ORF (label as "predicted")
- Start codon loss: No translation, display message
- Stop codon loss: Read through to show aberrant amino acids

### Variant Embedding
- Multiple variants can be embedded in single transcript
- Same transcript can appear multiple times with different variants
- Naming: GENE TranscriptID REF/ALT (ALT1, ALT2 for multiples)

### MVP Scope Decision
- **Consensus**: Wait for variant integration before public release
- **Rationale**: Variant embedding is the unique value proposition

## External Tool References

### Clustal Omega
- **Web tool**: https://www.ebi.ac.uk/Tools/msa/clustalo/
- **Documentation/API**: https://www.ebi.ac.uk/seqdb/confluence/display/JDSAT/Clustal+Omega+Help+and+Documentation

### Nightingale Components (EBI)
- **Main site**: https://ebi-webcomponents.github.io/nightingale/#/
- **MSA viewer**: protvista-msa component
- **Source**: react-msa-viewer fork at https://github.com/ebi-webcomponents/react-msa-viewer

### Other Tools Considered
- MARRVEL tool
- Jalview (UniProt may switch to this)

## Working Group Contacts

Meeting recordings available in: WG Meeting Recordings folder
https://drive.google.com/drive/folders/1HuwZ24JiahjvhRKdgEFfO4DVvHfprdHA

## Use Cases from WG Discussions

### From All Hands PAVI Demo (April 2024)
1. **Variant lookup by position**: "I saw R620G in a paper, can I find and view it?"
   - Need variant search beyond ID/symbol

2. **Cross-species variant mapping**: "Is there a corresponding variant in fly?"
   - Additional annotations track showing variants for species/region
   - User can add track or start new alignment

3. **Better variant highlighting**: Already in backlog

### Original User Story
> As a user/researcher/clinician, I want to see protein alignments of proteins I have picked (isoforms from same species, orthologs between species), and see where known variants are located, whether they affect conserved AAs, are in protein domains, or relative to exon boundaries.

### Primary Goals
1. Find corresponding variants between species
2. Compare phenotypes to variant location
3. Determine if patient variant is candidate for observed phenotypes

## Data Issues Discovered

### ZFIN
- Missing strand information at gene level (only at transcript level)
- Ticket: SCRUM-4568
- **Impact**: PAVI crashes with ZFIN genes until fixed

### Flybase
- CDSs in GFF3 submitted without stop codon (corrected)
- Trans-spliced transcripts (ignored for now)

### Xenbase
- Multiple overlapping CDS regions per transcript (processing errors)

### Human GFF3
- Some CDS phasing issues (being checked)

### CDS vs Longest ORF
- Match in only ~50% of transcripts
- Most cases: annotated CDS shorter than longest ORF (first start codon not used)
- Some in different frame
