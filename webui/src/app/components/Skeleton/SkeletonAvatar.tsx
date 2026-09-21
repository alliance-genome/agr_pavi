'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SkeletonAvatarProps {
    size?: AvatarSize;
    className?: string;
    animated?: boolean;
    'aria-label'?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
    sm: styles.avatarSm,
    md: styles.avatarMd,
    lg: styles.avatarLg,
    xl: styles.avatarXl,
};

export function SkeletonAvatar({
    size = 'md',
    className = '',
    animated = true,
    'aria-label': ariaLabel = 'Loading avatar...',
}: SkeletonAvatarProps) {
    return (
        <div
            className={`
                ${animated ? styles.skeleton : ''}
                ${styles.avatar}
                ${sizeClasses[size]}
                ${className}
            `}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default SkeletonAvatar;
