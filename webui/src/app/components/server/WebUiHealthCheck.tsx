'use server;'

import React, { FunctionComponent } from 'react';

import { redirect } from "next/navigation";

export async function apiHealthHTTPStatus(): Promise<[number, string]|undefined> {
    const apiHealthResponse = fetch(`${process.env.PAVI_API_BASE_URL}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'accept': 'application/json'
        }
    })
    .then((response: Response) => {
        const responseText = response.text()
        return Promise.all([response.status, responseText])
    })
    .catch((e: Error) => {
        console.error('Error caught while querying API health:', e)
        return undefined;
    });

    return apiHealthResponse
}

export const WebUiHealthCheck: FunctionComponent = async() => {
    const apiHealthResponse = await apiHealthHTTPStatus()
    if( !apiHealthResponse ){
        console.error('Undefined apiHealthResponse received.')
        redirect('/error')
    }

    const apiStatus = apiHealthResponse[0]

    if( !apiStatus || apiStatus === 408 || apiStatus === 404 ){
        redirect('/error')
    }
    else {
        let message = 'Welcome to PAVI! '

        if( apiStatus === 200 ){
            message += 'This the web application is healthy and ready to receive!'
        }
        else{
            message += 'While the web application itself is healthy, the API seems unhealth so some errors might occur.'
        }
        return (
            <div id="response-msg">{message}</div>
        )
    }
}
