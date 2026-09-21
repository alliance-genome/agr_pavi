'use client'

import React, { FunctionComponent } from 'react';

export interface TextAlignmentProps {
    readonly alignmentResult?: string
}
export const TextAlignment: FunctionComponent<TextAlignmentProps> = (props: TextAlignmentProps) => {
    return (
        <textarea
            id='alignment-result-text'
            value={props.alignmentResult}
            readOnly={true}
            style={{
                width: "100%",
                height: "500px",
                fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                fontSize: "12px",
                whiteSpace: "pre",
                overflowX: "auto",
                resize: "vertical"
            }}
        />
    )
}
