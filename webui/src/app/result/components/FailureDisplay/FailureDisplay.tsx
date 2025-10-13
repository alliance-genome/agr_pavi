'use client'

import React, { FunctionComponent } from 'react';

export interface FailureDisplayProps {
    readonly failureList: Map<string, string>
}
export const FailureDisplay: FunctionComponent<FailureDisplayProps> = (props: FailureDisplayProps) => {
    if(props.failureList.size > 0){
        return (
            <div id='alignment-failures'>
                Failures:
                <ul>
                    {[...props.failureList].map(([seqName, errorMessage]) => (
                            <li key={seqName}>{seqName}: {errorMessage}</li>
                        ))}
                </ul>
            </div>
        )
    }
    else {
        return (<div></div>)
    }
}
