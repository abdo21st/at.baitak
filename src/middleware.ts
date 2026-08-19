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

  // Route Mapping:
  // 1. at.mtapp.ly -> Super Admin Dashboard Control Panel
  // 2. at.baitak.mtapp.ly -> صيدلية بيتك (Baytak Pharmacy)
  // 3. *.mtapp.ly -> Sub-tenant businesses
  const hostClean = hostname.split(':')[0].toLowerCase();
  let tenantSlug = 'baytak';
  let isSuperAdminHost = false;

  if (hostClean === 'at.mtapp.ly' || hostClean === 'admin.mtapp.ly') {
    isSuperAdminHost = true;
    tenantSlug = 'super-admin';
  } else if (
    hostClean === 'at.baitak.mtapp.ly' ||
    hostClean === 'baitak.mtapp.ly' ||
    hostClean === 'localhost' ||
    hostClean === '127.0.0.1'
  ) {
    tenantSlug = 'baytak';
  } else if (hostClean.endsWith('.mtapp.ly')) {
    tenantSlug = hostClean.replace('.mtapp.ly', '');
  }

  // Clone headers and inject tenant slug
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  // If user visits root / on at.mtapp.ly, redirect directly to Super Admin dashboard
  if (isSuperAdminHost && url.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard/super-admin', request.url));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
