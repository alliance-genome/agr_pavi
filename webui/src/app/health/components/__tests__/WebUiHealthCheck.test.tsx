/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';

import fetchMock from 'fetch-mock';

import { apiHealthHTTPStatus, WebUiHealthCheck } from '../WebUiHealthCheck';
import { renderToString } from 'react-dom/server';
import { env } from 'process';

env.PAVI_API_BASE_URL = ''


fetchMock.config.allowRelativeUrls = true

// Mock the global fetch function
fetchMock.mockGlobal()

// Mock API health responses
const mockApiUpResponse = () => (new Response('{"status": "up"}', {status: 200}))
const mockApiDownResponse = () => (new Response('{}', {status: 500}))
const mockApiNotAccessibleResponse = () => { throw Error('Fetch-mock API not accessible.') }

// Mock varying API health responses
let response_index = -1
const apiHealthResponseRota = [
    mockApiUpResponse,
    mockApiDownResponse,
    mockApiNotAccessibleResponse
]
const mockChangingApiHealthResponse = () => {
    response_index += 1
    if( response_index >= apiHealthResponseRota.length ){
        response_index = 0
    }
    return apiHealthResponseRota[response_index]
}

beforeEach(() => {
    // Clear fetchMock between tests
    fetchMock.removeRoutes({includeFallback: true, includeSticky: true});
    fetchMock.clearHistory()
});

describe('apiHealthHTTPStatus function testing', () => {
    it('returns correct, uncached health status', async () => {

        // Test first API Health query response (success)
        fetchMock.route('/api/health', mockChangingApiHealthResponse, {name: 'catch-api-health'});

        const apiHealthUpResponse = await apiHealthHTTPStatus()
        expect(apiHealthUpResponse).toBeDefined()
        expect(apiHealthUpResponse![0]).toBe(200)

        const fetchCalls1 = fetchMock.callHistory.calls('catch-api-health')
        expect(fetchCalls1).toHaveLength(1)
        expect(fetchCalls1[0].options).toHaveProperty('cache', 'no-store')
        expect(fetchCalls1[0].response?.status).toBe(200)

        // Test second API Health query response (failure)
        const apiHealthDownResponse = await apiHealthHTTPStatus()
        expect(apiHealthDownResponse).toBeDefined()
        expect(apiHealthDownResponse![0]).toBe(500)

        const fetchCalls2 = fetchMock.callHistory.calls('catch-api-health')
        expect(fetchCalls2).toHaveLength(2)
        expect(fetchCalls2[0].response?.status).toBe(200)
        expect(fetchCalls2[1].options).toHaveProperty('cache', 'no-store')
        expect(fetchCalls2[1].response?.status).toBe(500)

        // Test third API Health query response (not accessible)
        const apiHealthInaccessibleResponse = await apiHealthHTTPStatus()
        expect(apiHealthInaccessibleResponse).toBeUndefined()

        const fetchCalls3 = fetchMock.callHistory.calls('catch-api-health')
        expect(fetchCalls3).toHaveLength(3)
        expect(fetchCalls3[0].response?.status).toBe(200)
        expect(fetchCalls3[1].response?.status).toBe(500)
        expect(fetchCalls3[2].response?.status).toBeUndefined()
        expect(fetchCalls3[2].options).toHaveProperty('cache', 'no-store')
    })
})

describe('WebUI Health Check component testing', () => {
    it('redirects on failing to access API', async () => {
        // Test the component's return behaviour when API is not accessible
        // (ensure non-200 return status, as AWS health checks rely on this)
        fetchMock.route('/api/health', mockApiNotAccessibleResponse);

        let caughtRedirect = false
        try {
            renderToString(await WebUiHealthCheck({}))
        }
        catch (e: any) {
            if( e.message === 'NEXT_REDIRECT' ){
                caughtRedirect = true
                console.log('Caught a next.js redirect!')
            }
            else{
                console.error('caught error while rendering:', e)
                throw e
            }
        }
        finally {
            expect(caughtRedirect).toBe(true)
        }
    })

    it('correctly reports unhealthy API with successful page render', async () => {
        // Test the component's return behaviour when API is reporting unhealth
        // (ensure 200 return status, as AWS health checks rely on this)
        fetchMock.route('/api/health', mockApiDownResponse);

        let caughtRedirect = false
        let htmlStr: string = ''
        try {
            htmlStr = renderToString(await WebUiHealthCheck({}))
        }
        catch (e: any) {
            if( e.message === 'NEXT_REDIRECT' ){
                caughtRedirect = true
                console.log('Caught a next.js redirect!')
            }
            else{
                console.error('caught error while rendering:', e)
                throw e
            }
        }
        finally {
            expect(caughtRedirect).toBe(false)
            expect(htmlStr).toContain('While the web application itself is healthy, the API seems unhealth so some errors might occur.')
        }
    })

    it('correctly reports healthy API with successful page render', async () => {
        // Test the component's return behaviour when API is reporting unhealth
        // (ensure 200 return status, as AWS health checks rely on this)
        fetchMock.route('/api/health', mockApiUpResponse);

        let caughtRedirect = false
        let htmlStr: string = ''
        try {
            htmlStr = renderToString(await WebUiHealthCheck({}))
        }
        catch (e: any) {
            if( e.message === 'NEXT_REDIRECT' ){
                caughtRedirect = true
                console.log('Caught a next.js redirect!')
            }
            else{
                console.error('caught error while rendering:', e)
                throw e
            }
        }
        finally {
            expect(caughtRedirect).toBe(false)
            expect(htmlStr).toContain('This the web application is healthy and ready to receive!')
        }
    })
})
