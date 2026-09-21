import type { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { withBasePath } from '../../../utils/basePath';
import styles from './guide.module.css';

export const metadata: Metadata = {
    title: 'User Guide | PAVI',
    description: 'A complete guide to submitting alignment jobs, adding variants, and reading results in PAVI.',
};

export default function GuidePage() {
    return (
        <article className={styles.guide}>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Help', href: '/help' },
                    { label: 'User Guide' },
                ]}
            />

            <header className={styles.mast}>
                <p className={styles.kicker}>User Guide</p>
                <h1 className={styles.title}>PAVI — Protein Annotation &amp; Variant Inspector</h1>
                <p className={styles.lede}>
                    Align protein sequences across model organisms and overlay their variants — from picking a
                    gene to reading the alignment. This guide walks through every part of the tool, with
                    screenshots of what you&rsquo;ll see.
                </p>
                <ul className={styles.meta}>
                    <li>Alliance of Genome Resources</li>
                    <li>Alignment by Clustal Omega</li>
                    <li>Viewer built on Nightingale</li>
                </ul>
            </header>

            <div className={styles.shell}>
                <nav className={styles.toc} aria-label="Guide contents">
                    <h2 className={styles.tocTitle}>On this page</h2>
                    <ol className={styles.tocList}>
                        <li><a className={styles.tocLink} href="#overview">What PAVI does</a></li>
                        <li><a className={styles.tocLink} href="#quickstart">Quick start</a></li>
                        <li><a className={styles.tocLink} href="#submit">Submitting a job</a></li>
                        <li><a className={styles.tocLink} href="#variants">Adding specific variants</a></li>
                        <li><a className={styles.tocLink} href="#ortholog">Ortholog alignment</a></li>
                        <li><a className={styles.tocLink} href="#bulk">Bulk upload</a></li>
                        <li><a className={styles.tocLink} href="#progress">Tracking progress</a></li>
                        <li><a className={styles.tocLink} href="#results">Reading your results</a></li>
                        <li><a className={styles.tocLink} href="#jobs">My Jobs</a></li>
                        <li><a className={styles.tocLink} href="#trouble">Tips &amp; troubleshooting</a></li>
                        <li><a className={styles.tocLink} href="#glossary">Glossary</a></li>
                    </ol>
                </nav>

                <div className={styles.content}>
                    <section id="overview" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>Start here</p>
                        <h2 className={styles.sec}>What PAVI does</h2>
                        <p className={styles.lead}>
                            PAVI compares the same protein across different organisms — or several transcripts
                            of one gene — and shows you where the sequence is conserved and where known
                            variants land.
                        </p>
                        <p>
                            You give PAVI one or more <strong>genes</strong>; it retrieves the matching protein
                            sequences, aligns them with Clustal Omega, and presents an interactive alignment
                            with variant annotations mapped on. Everything is built from public Alliance of
                            Genome Resources data.
                        </p>

                        <h3>Supported organisms</h3>
                        <ul className={styles.species}>
                            <li>Human</li>
                            <li>Mouse</li>
                            <li>Rat</li>
                            <li>Zebrafish</li>
                            <li>Frog <i>(X. tropicalis)</i></li>
                            <li>Fruit fly</li>
                            <li>Nematode <i>(C. elegans)</i></li>
                            <li>Yeast <i>(S. cerevisiae)</i></li>
                        </ul>

                        <h3>How input works</h3>
                        <p>
                            You choose sequences by <strong>searching for a gene</strong> — by symbol (e.g.{' '}
                            <code>SOD1</code>) or ID (e.g. <code>HGNC:620</code>) — then picking its
                            transcripts. The species comes from the gene you select. Alignments need{' '}
                            <strong>at least two sequences</strong>.
                        </p>

                        <h3>The job lifecycle</h3>
                        <div className={styles.flow}>
                            <b>Submit</b><em>&rarr;</em><b>Progress</b><em>&rarr;</em><b>Result</b>
                        </div>
                        <p>
                            After you submit, PAVI tracks the job on a live progress page, then opens the
                            result automatically. Every job has a unique ID, and result pages are{' '}
                            <strong>shareable by URL</strong> — send the link and the recipient sees the same
                            alignment.
                        </p>
                    </section>

                    <section id="quickstart" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>In a hurry</p>
                        <h2 className={styles.sec}>Quick start</h2>
                        <ol className={styles.steps}>
                            <li>
                                <h4 className={styles.stepTitle}>Open Submit Job</h4>
                                <p>
                                    From the top navigation, choose <strong>Submit Job</strong>. New to PAVI?
                                    Click <strong>Load Example</strong> to fill the form with a ready-made
                                    dataset.
                                </p>
                            </li>
                            <li>
                                <h4 className={styles.stepTitle}>Pick a gene</h4>
                                <p>
                                    Type a symbol or ID in the <strong>Gene</strong> field and select a
                                    suggestion. Add more with <strong>Add Another Gene</strong> for
                                    cross-species comparisons.
                                </p>
                            </li>
                            <li>
                                <h4 className={styles.stepTitle}>Choose transcripts</h4>
                                <p>
                                    Select one or more transcripts per gene — at least two sequences total
                                    across the form.
                                </p>
                            </li>
                            <li>
                                <h4 className={styles.stepTitle}>(Optional) Add variants</h4>
                                <p>
                                    Open the <strong>Alleles</strong> box to include variants; paste a full
                                    HGVS to add a specific one.
                                </p>
                            </li>
                            <li>
                                <h4 className={styles.stepTitle}>Submit and read the result</h4>
                                <p>
                                    Click <strong>Submit Job</strong>, watch the progress page, and explore
                                    the alignment when it opens.
                                </p>
                            </li>
                        </ol>
                    </section>

                    <section id="submit" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>The main workflow</p>
                        <h2 className={styles.sec}>Submitting a job</h2>
                        <p>
                            The <strong>Submit Job</strong> page builds an alignment from one or more gene
                            entries. Each entry has a gene, its transcripts, and optional variants.
                        </p>

                        <figure className={styles.fig}>
                            <Image
                                src={withBasePath('/guide/01-submit.jpg')}
                                alt="The PAVI Submit Job page: a Create a New Alignment card explaining the three steps, a Load Example button, and one alignment entry with Gene, Transcripts, View transcripts, and Alleles controls."
                                width={1080}
                                height={708}
                                sizes="(max-width: 800px) 100vw, 760px"
                                className={styles.shot}
                            />
                            <figcaption className={styles.figcaption}>
                                <b>The Submit Job page.</b> Each row is one gene entry — Gene, Transcripts, an
                                optional View transcripts preview, and the optional Alleles box. Use{' '}
                                <b>Add Another Gene</b> to compare more.
                            </figcaption>
                        </figure>

                        <h3>Finding a gene</h3>
                        <p>
                            Type into the <strong>Gene</strong> field (placeholder <code>e.g. HGNC:620</code>).
                            PAVI searches by both ID and symbol and shows suggestions as{' '}
                            <code>SYMBOL (species)</code>. If a search finds nothing you&rsquo;ll see{' '}
                            <em>&ldquo;Failed to find gene, correct input and try again.&rdquo;</em>
                        </p>

                        <h3>Loading an example</h3>
                        <p>
                            Click <strong>Load Example</strong> to open the dataset picker, filter by{' '}
                            <strong>Basic</strong> / <strong>Cross-Species</strong> / <strong>Advanced</strong>,
                            and choose a card — each shows its genes and variant count. Loading replaces
                            whatever is in the form.
                        </p>

                        <h3>Comparing several genes</h3>
                        <p>
                            The form starts with one entry; <strong>Add Another Gene</strong> appends more —
                            this is how you build ortholog or multi-gene comparisons. Extra entries get a
                            remove button.
                        </p>

                        <h3>Selecting transcripts</h3>
                        <p>
                            The <strong>Transcripts</strong> box lists the gene&rsquo;s transcripts; each shows
                            the transcript name and, where available, its protein accession. Select as many as
                            you want to align.
                        </p>

                        <figure className={styles.fig}>
                            <Image
                                src={withBasePath('/guide/02-transcripts.jpg')}
                                alt="The View transcripts dialog titled Transcripts — Pax6, showing an interactive diagram of many isoform models drawn along a genomic position axis."
                                width={1080}
                                height={708}
                                sizes="(max-width: 800px) 100vw, 760px"
                                className={styles.shot}
                            />
                            <figcaption className={styles.figcaption}>
                                <b>The View transcripts dialog.</b> A read-only diagram of the gene&rsquo;s
                                isoforms along its genomic locus — a reference for deciding what to align. You
                                don&rsquo;t pick transcripts here; tall genes scroll inside the dialog.
                            </figcaption>
                        </figure>

                        <h3>Adding variants (the Alleles box)</h3>
                        <p>
                            The <strong>Alleles (optional)</strong> box adds known variants. It loads the
                            gene&rsquo;s variant-bearing alleles the first time you open it; each option shows
                            the allele name, its ID, and the variant name or a <em>&ldquo;{'{n}'} variants&rdquo;</em>{' '}
                            badge.
                        </p>
                        <div className={`${styles.callout} ${styles.calloutWarn}`}>
                            <span className={styles.calloutLabel}>Not every variant is listed</span>
                            <p>
                                For heavily-annotated genes, PAVI loads only about the first{' '}
                                <strong>100 alleles</strong> (ordered by genomic position). A variant beyond
                                that won&rsquo;t appear until you look it up by HGVS — see the next section.
                            </p>
                        </div>

                        <h3>Filtering the allele list</h3>
                        <p>
                            The funnel icon opens <strong>Filter alleles</strong>. Narrow by{' '}
                            <strong>molecular consequence</strong>, <strong>impact</strong>{' '}
                            (HIGH/MODERATE/LOW/MODIFIER), <strong>transcript</strong>, <strong>SIFT</strong>,{' '}
                            <strong>PolyPhen</strong>, and <strong>has disease / has phenotype</strong>. Quick
                            presets — <strong>Missense only</strong>, <strong>High impact</strong>,{' '}
                            <strong>Disease</strong> — set these in one click; <strong>Clear</strong> resets.
                            Selecting transcripts also auto-filters alleles to those affecting them.
                        </p>

                        <h3>Submitting</h3>
                        <p>
                            <strong>Submit Job</strong> stays disabled until every entry is valid (a gene plus
                            at least one transcript) and you have <strong>at least two sequences</strong>. On
                            success the job is saved to your local history and the progress page opens.
                        </p>
                    </section>

                    <section id="variants" className={`${styles.section} ${styles.prose}`}>
                        <p className={`${styles.secEyebrow} ${styles.secEyebrowHot}`}>Featured task</p>
                        <h2 className={styles.sec}>Adding a specific variant</h2>
                        <p>
                            The Alleles box does more than browse — you can pull in an exact variant even when
                            it isn&rsquo;t in the loaded list. Typing there does three things automatically,
                            with a live status beside the label:
                        </p>

                        <div className={`${styles.callout} ${styles.calloutKey}`}>
                            <span className={styles.calloutLabel}>The one rule</span>
                            <p>
                                To add a specific variant, paste its <strong>full HGVS</strong> — e.g.{' '}
                                <code>{'NC_000068.8:g.105521966G>T'}</code> — <strong>not</strong> just the
                                position number.
                            </p>
                        </div>

                        <figure className={styles.fig}>
                            <Image
                                src={withBasePath('/guide/03-variant.jpg')}
                                alt="The Alleles box with a full HGVS pasted into the filter; the status reads Added — select it below, and an option for Pax6Sey with its MGI ID and HGVS appears in the dropdown."
                                width={1080}
                                height={708}
                                sizes="(max-width: 800px) 100vw, 760px"
                                className={styles.shot}
                            />
                            <figcaption className={styles.figcaption}>
                                <b>Pasting a full HGVS.</b> PAVI resolves it directly, confirms it belongs to
                                the gene, and adds it — here <code>{'NC_000068.8:g.105521966G>T'}</code>{' '}
                                becomes the selectable <b>Pax6<sup>Sey</sup></b> allele. Tick its box to
                                include it.
                            </figcaption>
                        </figure>

                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>What you type</th>
                                        <th>What PAVI does</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            A full genomic HGVS<br />
                                            <code>{'NC_000068.8:g.105521966G>T'}</code>
                                        </td>
                                        <td>
                                            Looks it up directly; if it belongs to your gene, adds it as a
                                            selectable option.
                                        </td>
                                        <td><em>Added — select it below</em></td>
                                    </tr>
                                    <tr>
                                        <td>
                                            Other text, 3+ characters<br />
                                            (part of an allele name)
                                        </td>
                                        <td>Runs a best-effort variant search for the gene and merges matches.</td>
                                        <td><em>{'{n} match(es) added'}</em> / <em>No matches</em></td>
                                    </tr>
                                    <tr>
                                        <td>
                                            A bare position number<br />
                                            <code>105521966</code>
                                        </td>
                                        <td>
                                            Can&rsquo;t be resolved alone, so PAVI prompts for the full HGVS
                                            instead of searching in vain.
                                        </td>
                                        <td><em>Enter the full HGVS&hellip;</em></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>Where to get the HGVS</h3>
                        <p>
                            On the Alliance gene page, open <strong>&ldquo;Alleles and Variants&rdquo;</strong>.
                            Copy the whole genomic HGVS, including the accession prefix and the change:{' '}
                            <code>{'NC_000068.8:g.105521966G>T'}</code>.
                        </p>

                        <div className={`${styles.callout} ${styles.calloutPit}`}>
                            <span className={styles.calloutLabel}>Common pitfalls</span>
                            <p>
                                <strong>&ldquo;No match for this gene&rdquo;</strong> — the HGVS belongs to a
                                different gene, or the wrong species is selected. Confirm the gene, then paste
                                again.
                            </p>
                            <p>
                                <strong>No results</strong> — you may have typed only the position number.
                                Copy the complete HGVS (accession + change), verbatim.
                            </p>
                        </div>
                        <div className={`${styles.callout} ${styles.calloutTip}`}>
                            <span className={styles.calloutLabel}>Good to know</span>
                            <p>
                                A variant you add this way stays visible and selectable even with a transcript
                                or impact filter active — and it&rsquo;s submitted just like any listed
                                variant.
                            </p>
                        </div>
                    </section>

                    <section id="ortholog" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>One gene, many species</p>
                        <h2 className={styles.sec}>Ortholog alignment</h2>
                        <p>
                            The <strong>Ortholog Alignment</strong> page is a shortcut for the most common
                            comparison: one gene against its orthologs across model organisms — no manual
                            transcript picking.
                        </p>
                        <ol className={styles.steps}>
                            <li>
                                <h4 className={styles.stepTitle}>Pick a focus gene</h4>
                                <p>
                                    Search for one gene (placeholder <code>e.g., SOD1, TP53, PITX2</code>).
                                    PAVI confirms symbol, species, and ID.
                                </p>
                            </li>
                            <li>
                                <h4 className={styles.stepTitle}>Review the orthologs</h4>
                                <p>
                                    PAVI auto-fetches the orthologs into a checklist. The source gene is
                                    marked <strong>SOURCE</strong>; orthologs in the core Alliance species are
                                    pre-checked. Use <strong>All</strong>, <strong>AGR Species</strong>, or{' '}
                                    <strong>None</strong> to adjust the set.
                                </p>
                            </li>
                            <li>
                                <h4 className={styles.stepTitle}>Submit the alignment</h4>
                                <p>
                                    With at least two sequences ticked, click{' '}
                                    <strong>Submit Alignment</strong>. PAVI picks each gene&rsquo;s canonical
                                    transcript; genes with no usable protein are dropped and reported.
                                </p>
                            </li>
                        </ol>
                        <p>
                            Ortholog jobs don&rsquo;t include variant selection — for variant work, use the
                            main Submit Job page.
                        </p>
                    </section>

                    <section id="bulk" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>Many genes at once</p>
                        <h2 className={styles.sec}>Bulk upload</h2>
                        <p>
                            The <strong>Bulk Upload</strong> page pre-fills the submit form from a file, so
                            you don&rsquo;t enter genes one by one.
                        </p>
                        <h3>File format</h3>
                        <p>
                            Upload a <strong>CSV, TSV, TXT, or .xlsx</strong> file with a header row.
                            Delimiters are detected automatically; spreadsheets read the first sheet.
                        </p>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Column</th>
                                        <th>Required?</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><code>species</code></td>
                                        <td>Yes</td>
                                        <td>e.g. <em>Mus musculus</em></td>
                                    </tr>
                                    <tr>
                                        <td><code>gene_symbol</code></td>
                                        <td>Yes</td>
                                        <td>Aliases: <code>symbol</code>, <code>gene</code></td>
                                    </tr>
                                    <tr>
                                        <td><code>transcript</code></td>
                                        <td>Optional</td>
                                        <td>Blank &rarr; PAVI picks the canonical transcript</td>
                                    </tr>
                                    <tr>
                                        <td><code>variants</code></td>
                                        <td>Optional</td>
                                        <td>Allele IDs separated by <code>;</code> or <code>,</code></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p>
                            Click <strong>Download template</strong> for{' '}
                            <code>pavi-bulk-genes-template.csv</code> — a working example (mouse and rat{' '}
                            <em>Sod1</em>) to edit.
                        </p>
                        <h3>What happens on upload</h3>
                        <p>
                            PAVI resolves each row to a gene by symbol + species, <strong>best-effort</strong>:
                            exact matches load; the rest are skipped and listed with a reason (missing
                            species/symbol, no gene found, ambiguous, duplicate, or lookup failed) — e.g.{' '}
                            <em>&ldquo;Loaded 5 genes &middot; skipped 2 rows.&rdquo;</em> Loaded genes drop
                            into an <strong>editable, pre-filled submit form</strong>.
                        </p>
                    </section>

                    <section id="progress" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>While it runs</p>
                        <h2 className={styles.sec}>Tracking progress</h2>
                        <p>
                            After you submit, the <strong>progress</strong> page opens with your job ID and
                            refreshes every few seconds.
                        </p>
                        <ul className={styles.plainList}>
                            <li>
                                <strong>Pipeline timeline</strong> — five stages from <em>Job Submitted</em>{' '}
                                through <em>Sequence Retrieval</em> and <em>Alignment (Clustal Omega)</em> to{' '}
                                <em>Finalizing Results</em>, each with a live status and timestamp.
                            </li>
                            <li>
                                <strong>Pipeline log</strong> — a running, colour-coded console of what the
                                pipeline is doing.
                            </li>
                        </ul>
                        <p>
                            On completion you&rsquo;ll see <strong>Alignment Complete!</strong> and PAVI opens
                            the result. On failure, an error box explains what happened and offers{' '}
                            <strong>Submit New Job</strong>. Typical runtimes:{' '}
                            <span className={`${styles.pill} ${styles.pillRun}`}>2&ndash;5 seq</span> ~30 s&ndash;2 min
                            &middot; <span className={`${styles.pill} ${styles.pillRun}`}>5&ndash;10</span> ~2&ndash;5 min
                            &middot; <span className={`${styles.pill} ${styles.pillRun}`}>10+</span> ~5&ndash;15 min.
                        </p>
                    </section>

                    <section id="results" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>The payoff</p>
                        <h2 className={styles.sec}>Reading your results</h2>
                        <p>
                            The result page centres on an interactive alignment, with a summary above it and
                            downloads in the header.
                        </p>

                        <figure className={styles.fig}>
                            <Image
                                src={withBasePath('/guide/04-alignment.jpg')}
                                alt="The interactive alignment viewer: a position ruler with variant markers across the top, sequence names down the left, and a colour-coded multiple sequence alignment grid of amino-acid residues."
                                width={1080}
                                height={189}
                                sizes="(max-width: 800px) 100vw, 760px"
                                className={styles.shot}
                            />
                            <figcaption className={styles.figcaption}>
                                <b>The interactive alignment viewer.</b> Sequences (labelled by name and
                                species) align column-by-column with residues coloured by scheme; the ruler
                                carries variant markers, and clicking a column or a variant card zooms
                                straight to it.{' '}
                                <span className={styles.figNote}>Example: a nematode/insect ortholog set.</span>
                            </figcaption>
                        </figure>

                        <h3>The summary</h3>
                        <p>
                            The <strong>Alignment Results</strong> bar shows sequence count, alignment length,
                            and variant count at a glance. Expand it for conservation and gap-content bars,
                            identical positions and the longest conserved block, a colour-graded{' '}
                            <strong>pairwise identity matrix</strong> (green = high, red = low), the species
                            list, and job details.
                        </p>
                        <div className={`${styles.callout} ${styles.calloutInfo}`}>
                            <span className={styles.calloutLabel}>Variant warnings</span>
                            <p>
                                If a selected variant produced no protein change on the aligned transcript, the
                                summary explains why and lists the skipped IDs — variant effects are
                                transcript-specific.
                            </p>
                        </div>

                        <h3>Display modes</h3>
                        <div className={styles.cards}>
                            <div className={styles.card}>
                                <h4 className={styles.cardTitle}>Interactive (Virtualized)</h4>
                                <p className={styles.cardText}>
                                    The full Nightingale viewer — the default, shown above. Handles large sets
                                    smoothly.
                                </p>
                            </div>
                            <div className={styles.card}>
                                <h4 className={styles.cardTitle}>Interactive (Legacy)</h4>
                                <p className={styles.cardText}>An earlier interactive renderer, kept as a fallback.</p>
                            </div>
                            <div className={styles.card}>
                                <h4 className={styles.cardTitle}>Text</h4>
                                <p className={styles.cardText}>A plain monospace alignment to read or copy directly.</p>
                            </div>
                        </div>

                        <h4 className={styles.mini}>Colour schemes</h4>
                        <p>
                            The colour dropdown groups many schemes: <strong>Recommended</strong> (Clustal2,
                            Conservation), <strong>Physical properties</strong> (Hydrophobicity, Charged,
                            Polar&hellip;), <strong>Structural</strong> (Buried index, Helix/Strand/Turn
                            propensity), and <strong>Classic</strong> (Taylor, Zappo, Lesk, Cinema, Mae).
                        </p>

                        <h4 className={styles.mini}>Variants on the alignment</h4>
                        <p>
                            With <strong>Variant Locations</strong> on (default), affected residues are boxed
                            with a <strong>red</strong> outline and appear as numbered markers on the variants
                            track. Filter shown variants by <strong>Type</strong>,{' '}
                            <strong>Consequence</strong>, and <strong>Disease / Phenotype</strong>. The
                            collapsible <strong>Variant Information</strong> panel gives a card per variant —
                            impact, ID, species, the ref&rarr;alt change, positions, protein HGVS, consequence,
                            and disease/phenotype badges. <strong>Click a coding variant&rsquo;s card to jump
                            and zoom to it.</strong>
                        </p>

                        <h4 className={styles.mini}>Inspecting a position &amp; sequences</h4>
                        <p>
                            Click any column to open the <strong>Position Info</strong> panel: position number,
                            conservation, gap count, consensus residue, and residue distribution. Click a
                            sequence chip to <strong>promote it to the reference (top) row</strong>, or use its
                            eye toggle to hide that sequence&rsquo;s variants.
                        </p>

                        <h4 className={styles.mini}>Navigating &amp; zooming</h4>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Keys</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><kbd>&larr;</kbd> <kbd>&rarr;</kbd></td>
                                        <td>Pan left / right</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>&uarr;</kbd> <kbd>&darr;</kbd></td>
                                        <td>Scroll through sequences</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>+</kbd> <kbd>=</kbd> / <kbd>-</kbd> <kbd>_</kbd></td>
                                        <td>Zoom in / out</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Home</kbd> <kbd>End</kbd></td>
                                        <td>Jump to start / end</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Esc</kbd></td>
                                        <td>Close full-screen view</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p>
                            You can also drag-zoom on the ruler; the viewer auto-zooms to the first variant on
                            load. <strong>Full Screen</strong> opens a full-window version in a new tab.
                        </p>

                        <h3>Saving &amp; sharing</h3>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Option</th>
                                        <th>What you get</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Download</strong> (summary)</td>
                                        <td>The alignment as a FASTA file</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Download .db</strong> (card header)</td>
                                        <td>The full per-job SQLite database — inputs, alignment, and sequence info</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Share</strong></td>
                                        <td>Copies the result URL — anyone with the link sees the same alignment</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className={styles.mini}>What&rsquo;s inside the .db</h4>
                        <p>
                            The download is a standard <strong>SQLite</strong> file (
                            <code>{'pavi-job-<id>.db'}</code>) you can open in any SQLite client —{' '}
                            <a href="https://sqlitebrowser.org" target="_blank" rel="noreferrer">
                                DB Browser for SQLite
                            </a>
                            , the <code>sqlite3</code> command line, or Python&rsquo;s <code>sqlite3</code> /
                            pandas. It is self-contained: one file holds the whole job, in three tables.
                        </p>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Table</th>
                                        <th>Holds</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><code>metadata</code></td>
                                        <td>
                                            Job info as key/value — <code>job_id</code>,{' '}
                                            <code>completed_at</code>, <code>input_count</code>, and schema
                                            version.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><code>input_seq_regions</code></td>
                                        <td>
                                            The original request — one row per input sequence region, stored
                                            as JSON (<code>region_json</code>).
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><code>results</code></td>
                                        <td>
                                            The outputs as named blobs: <code>alignment</code> (the Clustal
                                            alignment, <code>text/plain</code>) and <code>seq_info</code> (the
                                            aligned sequence &amp; variant info, <code>application/json</code>).
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p>
                            So the same file that reproduces your alignment also carries the exact inputs and
                            the per-residue variant mapping — useful for scripting, re-analysis, or archiving.
                        </p>

                        <div className={`${styles.callout} ${styles.calloutTip}`}>
                            <span className={styles.calloutLabel}>Need an image?</span>
                            <p>
                                There&rsquo;s no built-in image export — use <strong>Full Screen</strong> and
                                take a screenshot for figures and slides.
                            </p>
                        </div>
                    </section>

                    <section id="jobs" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>Your history</p>
                        <h2 className={styles.sec}>My Jobs</h2>
                        <p>
                            The <strong>My Jobs</strong> page keeps a history of jobs you&rsquo;ve run{' '}
                            <em>in this browser</em>, with counts of Total, Completed, In Progress, and Failed
                            at the top.
                        </p>
                        <figure className={styles.fig}>
                            <Image
                                src={withBasePath('/guide/05-jobs.jpg')}
                                alt="The My Jobs page: summary cards for Total, Completed, In Progress and Failed, above a searchable table of jobs with status pills, gene badges, and per-row star, view, copy-link and delete actions."
                                width={1080}
                                height={708}
                                sizes="(max-width: 800px) 100vw, 760px"
                                className={styles.shot}
                            />
                            <figcaption className={styles.figcaption}>
                                <b>My Jobs.</b> Every job you run in this browser, with status, genes, and
                                per-row actions — star, view (opens the result or progress page), copy the
                                shareable link, or delete. The summary cards tally Total, Completed, In
                                Progress, and Failed.
                            </figcaption>
                        </figure>
                        <p>
                            Each row shows the job ID, status (
                            <span className={`${styles.pill} ${styles.pillOk}`}>Completed</span>{' '}
                            <span className={`${styles.pill} ${styles.pillRun}`}>In progress</span>{' '}
                            <span className={`${styles.pill} ${styles.pillFail}`}>Failed</span>), genes,
                            transcript count, date, and duration — sortable, searchable, paginated. Per-row
                            actions: <strong>Star</strong>, <strong>View</strong> (opens result or progress),{' '}
                            <strong>Copy Link</strong> (completed jobs), <strong>Resubmit</strong> (failed
                            jobs), and <strong>Delete</strong>.
                        </p>
                        <div className={`${styles.callout} ${styles.calloutInfo}`}>
                            <span className={styles.calloutLabel}>Moving between browsers</span>
                            <p>
                                Because history is local, use <strong>Add by UUID</strong> to bring in a job
                                you ran elsewhere or received as a shared link. Results are retained for{' '}
                                <strong>30 days</strong>.
                            </p>
                        </div>
                    </section>

                    <section id="trouble" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>When something&rsquo;s off</p>
                        <h2 className={styles.sec}>Tips &amp; troubleshooting</h2>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Symptom</th>
                                        <th>What to try</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Can&rsquo;t find a gene</td>
                                        <td>
                                            Use a valid ID (<code>HGNC:620</code>, <code>MGI:87866</code>) or
                                            the exact symbol; confirm the species is one of the eight
                                            supported organisms.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>A specific variant isn&rsquo;t listed</td>
                                        <td>
                                            Paste its full HGVS into the Alleles box — see{' '}
                                            <a href="#variants">Adding specific variants</a>. Only ~100
                                            alleles preload.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Submit stays greyed out</td>
                                        <td>
                                            Every entry needs a gene <em>and</em> a transcript, and you need
                                            at least two sequences total.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Job failed</td>
                                        <td>
                                            Often an invalid gene ID, or a transcript with no coding sequence
                                            — try another transcript. Very large jobs can time out; reduce the
                                            sequence count.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Job is slow</td>
                                        <td>
                                            Runtime scales with sequence length and count (alignment &asymp;
                                            O(n&sup2;)) and current load.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>A selected variant &ldquo;did nothing&rdquo;</td>
                                        <td>
                                            Its effect is transcript-specific and may be silent on the aligned
                                            transcript — the summary lists these.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p>
                            Still stuck? Report issues on the project&rsquo;s <strong>GitHub</strong> tracker
                            (linked from the app&rsquo;s Help center), and browse the in-app{' '}
                            <strong>Help</strong> tab for FAQs and a glossary.
                        </p>
                    </section>

                    <section id="glossary" className={`${styles.section} ${styles.prose}`}>
                        <p className={styles.secEyebrow}>Reference</p>
                        <h2 className={styles.sec}>Glossary</h2>
                        <div className={styles.tableWrap}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td><strong>Alignment</strong></td>
                                        <td>Lining up sequences so equivalent residues share a column.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Allele</strong></td>
                                        <td>A specific version of a gene, often carrying one or more variants.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>CDS</strong></td>
                                        <td>Coding sequence — the part of a transcript translated into protein.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Clustal Omega</strong></td>
                                        <td>The multiple-sequence-alignment algorithm PAVI uses.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Conservation</strong></td>
                                        <td>How similar a column is across the aligned sequences.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>HGVS</strong></td>
                                        <td>Standard variant naming, e.g. <code>{'NC_000068.8:g.105521966G>T'}</code>.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>MSA</strong></td>
                                        <td>Multiple sequence alignment — more than two sequences aligned together.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Nightingale</strong></td>
                                        <td>The EMBL-EBI component library powering PAVI&rsquo;s viewer.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ortholog</strong></td>
                                        <td>The &ldquo;same&rdquo; gene in another species, from a common ancestor.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Transcript</strong></td>
                                        <td>One RNA product of a gene; a gene can have several.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Variant</strong></td>
                                        <td>A difference from the reference sequence at a genomic position.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <p className={styles.closing}>
                        PAVI — Protein Annotation &amp; Variant Inspector &middot; a tool of the Alliance of
                        Genome Resources. This guide describes the shipped web application; in-app wording may
                        change between releases.
                    </p>
                </div>
            </div>
        </article>
    );
}
