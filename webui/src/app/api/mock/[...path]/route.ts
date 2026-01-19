import { NextRequest, NextResponse } from 'next/server';
import { getMockResponse } from '@/utils/mockData';

/**
 * Mock API route handler for visual testing
 * Catches all /api/mock/* requests and returns mock data
 * Only active when MOCK_API=true environment variable is set
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const fullPath = `/api/${path.join('/')}`;

    // Add small delay to simulate network request
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockData = getMockResponse(fullPath + request.nextUrl.search, 'GET');

    if (mockData.error) {
        return NextResponse.json(mockData, { status: 404 });
    }

    return NextResponse.json(mockData);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const fullPath = `/api/${path.join('/')}`;

    // Add small delay to simulate network request
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockData = getMockResponse(fullPath, 'POST');

    if (mockData.error) {
        return NextResponse.json(mockData, { status: 404 });
    }

    return NextResponse.json(mockData);
}
