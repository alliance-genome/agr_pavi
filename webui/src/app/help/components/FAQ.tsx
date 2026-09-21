'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { FAQItem } from '../helpContent';
import styles from '../help.module.css';

interface FAQProps {
    items: FAQItem[];
    expandedId?: string;
}

export function FAQ({ items, expandedId }: FAQProps) {
    const [activeIndex, setActiveIndex] = useState<number | number[] | null>(null);

    // Group FAQ items by category
    const groupedItems = useMemo(() => {
        const groups: Record<string, FAQItem[]> = {};
        items.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    }, [items]);

    // Handle expandedId prop to auto-expand a specific FAQ
    useEffect(() => {
        if (expandedId) {
            const index = items.findIndex(item => item.id === expandedId);
            if (index !== -1) {
                setActiveIndex(index);
            }
        }
    }, [expandedId, items]);

    const categories = Object.keys(groupedItems);

    return (
        <div className={styles.faqContainer}>
            {categories.map(category => (
                <div key={category} className={styles.faqCategory}>
                    <h3 className={styles.faqCategoryTitle}>{category}</h3>
                    <Accordion
                        multiple
                        activeIndex={activeIndex}
                        onTabChange={(e) => setActiveIndex(e.index)}
                        className={styles.faqAccordion}
                    >
                        {groupedItems[category].map((item) => (
                            <AccordionTab
                                key={item.id}
                                header={
                                    <span className={styles.faqQuestion}>
                                        <i className="pi pi-question-circle" />
                                        {item.question}
                                    </span>
                                }
                                pt={{
                                    headerAction: { 'aria-label': item.question },
                                }}
                            >
                                <p className={styles.faqAnswer}>{item.answer}</p>
                            </AccordionTab>
                        ))}
                    </Accordion>
                </div>
            ))}
        </div>
    );
}
