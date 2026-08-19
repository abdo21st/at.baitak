import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Exclude static assets, api routes, and system files from rewriting
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Detect subdomain
  // Examples:
  // alandalus.hodoork.ly -> tenantSlug = "alandalus"
  // admin.hodoork.ly -> tenantSlug = "admin"
  // localhost:3000 or custom IP -> tenantSlug = "main"
  const hostParts = hostname.split(':')[0].split('.');
  let tenantSlug = 'main';

  if (hostParts.length > 2 && hostParts[0] !== 'www') {
    tenantSlug = hostParts[0];
  }

  // Clone headers and inject tenant slug for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
