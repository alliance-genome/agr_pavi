import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_BASE = 'http://localhost:8080'  //TODO: make API_BASE an env variable (configurable)
const local_api_path = '/api'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {

    const request_path = request.nextUrl.pathname

    //Proxy root API requests to API server docs
    if (request_path === local_api_path) {
        return NextResponse.rewrite(new URL('/docs', API_BASE))
    }
    //Proxy all other API requests to respective API server endpoints
    else if (request_path.startsWith(local_api_path+'/')) {
        return NextResponse.rewrite(new URL(request_path, API_BASE))
    }
    //Proxy openAPI specs for API server docs
    else if (request_path === '/openapi.json') {
        return NextResponse.rewrite(new URL('/openapi.json', API_BASE))
    }
}

// Only apply middleware to API paths (and supporting /openapi.json call)
export const config = {
    matcher: ['/api/:path*', '/openapi.json'],
}
