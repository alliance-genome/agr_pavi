'use client';

import React from 'react';
import styles from './WorkflowStepper.module.css';

export type StepStatus = 'pending' | 'active' | 'completed';

export interface WorkflowStep {
    id: string;
    label: string;
    description?: string;
    status: StepStatus;
}

interface WorkflowStepperProps {
    steps: WorkflowStep[];
    orientation?: 'horizontal' | 'vertical';
    size?: 'small' | 'medium' | 'large';
    // eslint-disable-next-line no-unused-vars
    onStepClick?: (stepId: string) => void;
}

// Default PAVI workflow steps
export const PAVI_WORKFLOW_STEPS: Omit<WorkflowStep, 'status'>[] = [
    {
        id: 'submit',
        label: 'Submit',
        description: 'Enter sequences or gene IDs',
    },
    {
        id: 'configure',
        label: 'Configure',
        description: 'Select alignment options',
    },
    {
        id: 'processing',
        label: 'Processing',
        description: 'Alignment in progress',
    },
    {
        id: 'results',
        label: 'Results',
        description: 'View alignment results',
    },
];

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
    steps,
    orientation = 'horizontal',
    size = 'medium',
    onStepClick,
}) => {
    const getStepIcon = (status: StepStatus, index: number) => {
        if (status === 'completed') {
            return (
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            );
        }
        return <span>{index + 1}</span>;
    };

    return (
        <nav
            className={`${styles.stepper} ${styles[orientation]} ${styles[size]}`}
            aria-label="Workflow progress"
        >
            <ol className={styles.stepList}>
                {steps.map((step, index) => {
                    const isClickable = onStepClick && step.status !== 'pending';

                    return (
                        <li
                            key={step.id}
                            className={`${styles.step} ${styles[step.status]}`}
                        >
                            {/* Connector line (not for first item) */}
                            {index > 0 && (
                                <div
                                    className={`${styles.connector} ${
                                        steps[index - 1].status === 'completed'
                                            ? styles.connectorCompleted
                                            : ''
                                    }`}
                                    aria-hidden="true"
                                />
                            )}

                            {/* Step indicator */}
                            <button
                                type="button"
                                className={styles.stepIndicator}
                                onClick={() => isClickable && onStepClick(step.id)}
                                disabled={!isClickable}
                                aria-current={step.status === 'active' ? 'step' : undefined}
                                aria-label={`${step.label}: ${step.status}`}
                            >
                                <span className={styles.stepIcon}>
                                    {getStepIcon(step.status, index)}
                                </span>
                            </button>

                            {/* Step content */}
                            <div className={styles.stepContent}>
                                <span className={styles.stepLabel}>{step.label}</span>
                                {step.description && orientation === 'vertical' && (
                                    <span className={styles.stepDescription}>
                                        {step.description}
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

// Helper to create steps with status based on current step
export function createWorkflowSteps(
    currentStepId: string,
    customSteps?: Omit<WorkflowStep, 'status'>[]
): WorkflowStep[] {
    const steps = customSteps || PAVI_WORKFLOW_STEPS;
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);

    return steps.map((step, index) => ({
        ...step,
        status:
            index < currentIndex
                ? 'completed'
                : index === currentIndex
                ? 'active'
                : 'pending',
    })) as WorkflowStep[];
}
