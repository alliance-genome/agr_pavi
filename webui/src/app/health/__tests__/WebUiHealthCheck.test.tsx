/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';

import fetchMock from 'fetch-mock';

import { apiHealthHTTPStatus } from '@/app/components/server/WebUiHealthCheck';

// Mock the global fetch function
global.fetch = (fetchMock.sandbox() as typeof fetch)


//TODO: component testing with mocked API response to test page redirect (non-200 status return) on failed-to-access response

describe('WebUI Health Page testing', () => {
    // beforeEach(() => {
    //     fetchMock.mockReset();  // Clear fetchMock between tests
    // });

    // afterAll(() => {
    //     fetchMock.mockRestore();  // Clean up after all tests
    // });

    // beforeEach(() => {
    //     // Clear previous mock calls and implementations
    //     (global.fetch as jest.Mock).mockReset();
    // });

    it('returns uncached health status', async () => {

        // Test first API Health query response (success)
        const mockApiUpResponse = new Response('{"status": "up"}', {status: 200})
        fetchMock.mock('http://localhost:8000/api/health', mockApiUpResponse);

        const apiHealthUpResponse = await apiHealthHTTPStatus()
        expect(apiHealthUpResponse).toBeDefined
        expect(apiHealthUpResponse![0]).toBe(200)

        const fetchCalls1 = fetchMock.calls('path:/api/health')
        expect(fetchCalls1).toHaveLength(1)
        expect(fetchCalls1[0][1]).toHaveProperty('cache', 'no-store')
        expect(fetchCalls1[0].response?.status).toBe(200)

        // Test second API Health query response (failure)
        const mockApiDownResponse = new Response('{}', {status: 500})
        fetchMock.mock('http://localhost:8000/api/health', mockApiDownResponse, {overwriteRoutes: true});

        const apiHealthDownResponse = await apiHealthHTTPStatus()
        expect(apiHealthDownResponse).toBeDefined
        expect(apiHealthDownResponse![0]).toBe(500)

        const fetchCalls2 = fetchMock.calls('path:/api/health')
        expect(fetchCalls2).toHaveLength(2)
        expect(fetchCalls2[0].response?.status).toBe(200)
        expect(fetchCalls2[1][1]).toHaveProperty('cache', 'no-store')
        expect(fetchCalls2[1].response?.status).toBe(500)

        // Test third API Health query response (not accessible)
        const mockApiNotAccessibleResponse = { timeout: 5000 }
        fetchMock.mock('http://localhost:8000/api/health', mockApiNotAccessibleResponse, {overwriteRoutes: true});

        const apiHealthInaccessibleResponse = await apiHealthHTTPStatus()
        expect(apiHealthInaccessibleResponse).toBeUndefined

        const fetchCalls3 = fetchMock.calls('path:/api/health')
        expect(fetchMock.calls('path:/api/health')).toHaveLength(3)
        expect(fetchCalls3[0].response?.status).toBe(200)
        expect(fetchCalls3[1].response?.status).toBe(500)
        expect(fetchCalls3[2].response?.status).toBeUndefined
        expect(fetchCalls3[2][1]).toHaveProperty('cache', 'no-store')
    })
})
