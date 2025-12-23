'use client';

import React from 'react';

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="agr-footer">
            <div className="agr-footer-content">
                <p>
                    PAVI - Protein Annotation and Variant Inspector
                </p>
                <p>
                    Part of the{' '}
                    <a href="https://www.alliancegenome.org" target="_blank" rel="noopener noreferrer">
                        Alliance of Genome Resources
                    </a>
                </p>
                <p>
                    &copy; {currentYear} Alliance of Genome Resources
                </p>
            </div>
        </footer>
    );
};
