import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
    return (
        <div className={styles.homePage}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Protein Annotation and Variant Inspector
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Analyze protein sequences and variants across model organisms
                        with powerful sequence alignment and annotation tools.
                    </p>
                    <div className={styles.heroCta}>
                        <Link href="/submit" className={styles.primaryButton}>
                            Start New Analysis
                        </Link>
                        <Link href="/jobs" className={styles.secondaryButton}>
                            View My Jobs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className={styles.features}>
                <h2 className={styles.sectionTitle}>What You Can Do</h2>
                <div className={styles.featureGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </div>
                        <h3>Sequence Alignment</h3>
                        <p>
                            Perform multiple sequence alignments using MAFFT or Clustal Omega
                            with customizable parameters.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                <line x1="9" y1="9" x2="9.01" y2="9"/>
                                <line x1="15" y1="9" x2="15.01" y2="9"/>
                            </svg>
                        </div>
                        <h3>Cross-Species Comparison</h3>
                        <p>
                            Compare protein sequences across 7+ model organisms from
                            the Alliance of Genome Resources.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                <path d="M2 17l10 5 10-5"/>
                                <path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <h3>Variant Annotation</h3>
                        <p>
                            Annotate and visualize protein variants with evolutionary
                            context and conservation scores.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <line x1="3" y1="9" x2="21" y2="9"/>
                                <line x1="9" y1="21" x2="9" y2="9"/>
                            </svg>
                        </div>
                        <h3>Interactive Visualization</h3>
                        <p>
                            Explore alignments with interactive viewers featuring
                            multiple color schemes and export options.
                        </p>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className={styles.howItWorks}>
                <h2 className={styles.sectionTitle}>How It Works</h2>
                <div className={styles.stepsContainer}>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>1</div>
                        <h3>Submit Sequences</h3>
                        <p>Enter gene IDs or paste protein sequences in FASTA format.</p>
                    </div>
                    <div className={styles.stepConnector} aria-hidden="true" />
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>2</div>
                        <h3>Configure Options</h3>
                        <p>Select alignment algorithm and customize parameters.</p>
                    </div>
                    <div className={styles.stepConnector} aria-hidden="true" />
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>3</div>
                        <h3>View Results</h3>
                        <p>Explore interactive alignments and download results.</p>
                    </div>
                </div>
            </section>

            {/* Model Organisms Section */}
            <section className={styles.organisms}>
                <h2 className={styles.sectionTitle}>Supported Model Organisms</h2>
                <div className={styles.organismGrid}>
                    {[
                        { name: 'Human', species: 'Homo sapiens' },
                        { name: 'Mouse', species: 'Mus musculus' },
                        { name: 'Rat', species: 'Rattus norvegicus' },
                        { name: 'Zebrafish', species: 'Danio rerio' },
                        { name: 'Fruit Fly', species: 'Drosophila melanogaster' },
                        { name: 'Nematode', species: 'C. elegans' },
                        { name: 'Yeast', species: 'S. cerevisiae' },
                    ].map((org) => (
                        <div key={org.species} className={styles.organismCard}>
                            <span className={styles.organismName}>{org.name}</span>
                            <span className={styles.organismSpecies}>{org.species}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Call to Action */}
            <section className={styles.cta}>
                <h2>Ready to Get Started?</h2>
                <p>Submit your first alignment job in minutes.</p>
                <Link href="/submit" className={styles.primaryButton}>
                    Submit Job Now
                </Link>
            </section>
        </div>
    );
}
