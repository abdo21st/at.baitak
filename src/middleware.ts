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
  // at.mtapp.ly or mtapp.ly -> main platform dashboard
  // alnaqaa.mtapp.ly -> tenantSlug = "alnaqaa"
  // localhost:3000 or custom IP -> tenantSlug = "baytak" (صيدلية بيتك)
  const hostClean = hostname.split(':')[0].toLowerCase();
  let tenantSlug = 'baytak';

  if (hostClean === 'at.mtapp.ly' || hostClean === 'mtapp.ly' || hostClean === 'localhost' || hostClean === '127.0.0.1') {
    tenantSlug = 'baytak';
  } else if (hostClean.endsWith('.mtapp.ly')) {
    tenantSlug = hostClean.replace('.mtapp.ly', '');
  } else {
    const hostParts = hostClean.split('.');
    if (hostParts.length > 2 && hostParts[0] !== 'www' && hostParts[0] !== 'at') {
      tenantSlug = hostParts[0];
    }
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
