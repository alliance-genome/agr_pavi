// Help content data for PAVI Help Center

export interface HelpArticle {
    id: string;
    title: string;
    category: HelpCategory;
    summary: string;
    content: string;
    keywords: string[];
}

export type HelpCategory = 'getting-started' | 'features' | 'troubleshooting' | 'faq';

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
}

export interface GlossaryTerm {
    term: string;
    definition: string;
    relatedTerms?: string[];
}

export const helpArticles: HelpArticle[] = [
    {
        id: 'what-is-pavi',
        title: 'What is PAVI?',
        category: 'getting-started',
        summary: 'Learn about PAVI and its purpose for protein alignment visualization.',
        content: `PAVI (Proteins Annotations and Variants Inspector) is a bioinformatics web application
        developed by the Alliance of Genome Resources. It enables researchers to visualize protein
        sequence alignments with variant annotations across model organisms.

        PAVI uses Clustal Omega for multiple sequence alignment and EMBL-EBI's Nightingale components
        for interactive visualization. This allows you to compare orthologs and analyze the impact
        of genetic variants on protein sequences.`,
        keywords: ['pavi', 'introduction', 'overview', 'protein', 'alignment'],
    },
    {
        id: 'submitting-job',
        title: 'How to Submit a Job',
        category: 'getting-started',
        summary: 'Step-by-step guide to submitting an alignment job.',
        content: `To submit a new alignment job:

1. **Select a Gene**: Enter a gene ID (e.g., HGNC:620) or search by gene symbol. The autocomplete will suggest matching genes.

2. **Choose Transcripts**: After selecting a gene, choose which transcripts to include in the alignment. Multiple transcripts can be selected.

3. **Add Alleles (Optional)**: Select alleles with variants to see how mutations affect the protein sequence.

4. **Add More Entries**: Click "Add Entry" to include additional genes for comparison (ortholog analysis).

5. **Submit**: Click "Start Job" to begin the alignment process.

The job will be processed and you'll see real-time progress updates.`,
        keywords: ['submit', 'job', 'gene', 'transcript', 'allele', 'how to'],
    },
    {
        id: 'understanding-results',
        title: 'Understanding Your Results',
        category: 'features',
        summary: 'Learn how to interpret the alignment visualization.',
        content: `The results page displays your multiple sequence alignment with several interactive features:

**Navigation**:
- Use arrow keys or the navigation bar to pan through the alignment
- +/- keys to zoom in and out
- Home/End keys to jump to start/end

**Color Schemes**:
- Clustal2: Standard coloring based on amino acid properties
- Conservation: Highlights conserved regions
- Hydrophobicity: Colors by hydrophobic/hydrophilic properties

**Variant Highlighting**:
- Variants are marked with black borders on the affected positions
- Hover over variants for additional information

**Conservation Graph**:
- Toggle the conservation graph to see conservation scores across the alignment
- Higher scores indicate more conserved positions`,
        keywords: ['results', 'visualization', 'alignment', 'navigation', 'colors'],
    },
    {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        category: 'features',
        summary: 'Quick reference for keyboard navigation.',
        content: `**Alignment Navigation**:
- ← / → : Pan left/right
- + / = : Zoom in
- - / _ : Zoom out
- Home : Jump to start
- End : Jump to end
- Escape : Close fullscreen view

**General**:
- Tab : Navigate between form fields
- Enter : Submit form / Confirm action
- ? : Open help (when available)`,
        keywords: ['keyboard', 'shortcuts', 'navigation', 'accessibility'],
    },
    {
        id: 'job-failed',
        title: 'My Job Failed - What Now?',
        category: 'troubleshooting',
        summary: 'Common causes and solutions for failed jobs.',
        content: `If your job failed, here are common causes and solutions:

**1. Invalid Gene ID**
- Ensure you're using a valid gene identifier (HGNC, MGI, etc.)
- Check for typos in the gene symbol

**2. No CDS Regions**
- Some transcripts don't have coding sequences (CDS)
- Try selecting a different transcript

**3. Timeout**
- Very large alignments may timeout (>1 hour)
- Try reducing the number of sequences

**4. Network Issues**
- Check your internet connection
- Try refreshing the page and resubmitting

If problems persist, please report an issue on our GitHub repository.`,
        keywords: ['failed', 'error', 'troubleshooting', 'help', 'problem'],
    },
    {
        id: 'slow-processing',
        title: 'Why is My Job Taking So Long?',
        category: 'troubleshooting',
        summary: 'Understanding job processing times.',
        content: `Job processing time depends on several factors:

**Sequence Length**: Longer protein sequences take more time to align.

**Number of Sequences**: More sequences = longer alignment time. Clustal Omega scales approximately O(n²) with sequence count.

**Server Load**: During peak usage, jobs may queue before processing.

**Typical Times**:
- 2-5 sequences: 30 seconds - 2 minutes
- 5-10 sequences: 2-5 minutes
- 10+ sequences: 5-15 minutes

The progress page will show real-time updates on your job status.`,
        keywords: ['slow', 'time', 'processing', 'wait', 'long'],
    },
];

export const faqItems: FAQItem[] = [
    {
        id: 'faq-1',
        question: 'What organisms are supported?',
        answer: 'PAVI supports all model organisms in the Alliance of Genome Resources database, including human, mouse, rat, zebrafish, fly, worm, and yeast.',
        category: 'General',
    },
    {
        id: 'faq-2',
        question: 'Can I save my alignment results?',
        answer: 'Yes! Each job has a unique URL that you can bookmark or share. Results are stored for 30 days. You can also open the fullscreen view and take screenshots.',
        category: 'General',
    },
    {
        id: 'faq-3',
        question: 'What alignment algorithm is used?',
        answer: 'PAVI uses Clustal Omega, a fast and accurate multiple sequence alignment program that uses seeded guide trees and HMM profile-profile techniques.',
        category: 'Technical',
    },
    {
        id: 'faq-4',
        question: 'How are variants displayed?',
        answer: 'Variants are shown as black-bordered boxes on the alignment at the position where the variant affects the protein sequence. The variant position is calculated based on CDS coordinates.',
        category: 'Technical',
    },
    {
        id: 'faq-5',
        question: 'Can I compare genes from different species?',
        answer: 'Yes! This is one of PAVI\'s main features. Add entries for orthologous genes from different species to see conservation patterns and variant effects across organisms.',
        category: 'General',
    },
    {
        id: 'faq-6',
        question: 'Why can\'t I find my gene?',
        answer: 'Make sure you\'re using a valid gene identifier (e.g., HGNC:620, MGI:87866). If searching by symbol, try the full name or check the Alliance website for the correct ID.',
        category: 'Troubleshooting',
    },
    {
        id: 'faq-7',
        question: 'Is my data private?',
        answer: 'PAVI only accesses publicly available genomic data from the Alliance databases. No user data is collected or stored beyond the job submission.',
        category: 'General',
    },
    {
        id: 'faq-8',
        question: 'How do I report a bug?',
        answer: 'Please report bugs on our GitHub repository at https://github.com/alliance-genome/agr_pavi/issues with details about what you were doing and any error messages.',
        category: 'General',
    },
];

export const glossaryTerms: GlossaryTerm[] = [
    {
        term: 'Alignment',
        definition: 'A way of arranging sequences (DNA, RNA, or protein) to identify regions of similarity. PAVI performs multiple sequence alignment using Clustal Omega.',
        relatedTerms: ['MSA', 'Clustal Omega'],
    },
    {
        term: 'Allele',
        definition: 'A variant form of a gene. Different alleles can result in different protein sequences due to mutations.',
        relatedTerms: ['Variant', 'Mutation'],
    },
    {
        term: 'CDS',
        definition: 'Coding Sequence - the portion of a gene that encodes protein. It consists of exon sequences that are translated into amino acids.',
        relatedTerms: ['Exon', 'Transcript'],
    },
    {
        term: 'Clustal Omega',
        definition: 'A multiple sequence alignment program used by PAVI. It is fast and produces biologically meaningful alignments.',
    },
    {
        term: 'Conservation',
        definition: 'The degree to which a sequence (or position within a sequence) has been maintained across different species during evolution. Highly conserved regions are often functionally important.',
    },
    {
        term: 'Exon',
        definition: 'A segment of a gene that codes for protein. Exons are separated by introns and are spliced together to form the mature mRNA.',
        relatedTerms: ['CDS', 'Intron'],
    },
    {
        term: 'Gene',
        definition: 'A unit of heredity that encodes information for building proteins. In PAVI, you search for genes by their identifiers (e.g., HGNC:620).',
    },
    {
        term: 'MSA',
        definition: 'Multiple Sequence Alignment - the alignment of three or more biological sequences. PAVI displays MSA results using interactive visualization.',
        relatedTerms: ['Alignment'],
    },
    {
        term: 'Nightingale',
        definition: 'A library of web components developed by EMBL-EBI for visualizing biological data. PAVI uses Nightingale for its alignment viewer.',
    },
    {
        term: 'Ortholog',
        definition: 'Genes in different species that evolved from a common ancestor. Orthologs typically retain similar functions across species.',
        relatedTerms: ['Paralog'],
    },
    {
        term: 'Transcript',
        definition: 'An RNA molecule transcribed from a gene. A single gene can have multiple transcripts due to alternative splicing.',
        relatedTerms: ['CDS', 'Exon'],
    },
    {
        term: 'Variant',
        definition: 'A difference in DNA sequence compared to a reference. Variants can affect protein sequence and function.',
        relatedTerms: ['Allele', 'Mutation'],
    },
];

export const categoryInfo = {
    'getting-started': {
        title: 'Getting Started',
        description: 'New to PAVI? Start here to learn the basics.',
        icon: 'pi pi-play',
    },
    'features': {
        title: 'Features & Usage',
        description: 'Learn about PAVI\'s features and how to use them.',
        icon: 'pi pi-cog',
    },
    'troubleshooting': {
        title: 'Troubleshooting',
        description: 'Solutions to common problems and error messages.',
        icon: 'pi pi-wrench',
    },
    'faq': {
        title: 'FAQ',
        description: 'Frequently asked questions about PAVI.',
        icon: 'pi pi-question-circle',
    },
};
