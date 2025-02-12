'use client'

import React, { FunctionComponent } from 'react';

export interface TextAlignmentProps {
    readonly alignmentResult?: string
}
export const TextAlignment: FunctionComponent<TextAlignmentProps> = (props: TextAlignmentProps) => {
    return (
        <textarea id='alignment-result-text' value={props.alignmentResult} readOnly={true} style={{width: "700px", height: "500px"}} />
    )
}
