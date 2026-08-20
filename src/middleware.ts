import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const hostClean = hostname.split(':')[0].toLowerCase().trim();

  // Exclude static assets and next internal files from rewrite/redirect
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Route Mapping:
  // 1. at.mtapp.ly -> Super Admin Dashboard Control Panel
  // 2. at.baitak.mtapp.ly -> صيدلية بيتك (Baytak Pharmacy)
  // 3. *.mtapp.ly -> Sub-tenant businesses (e.g. at.mt.mtapp.ly -> at.mt)
  const incomingSlug = (request.headers.get('x-tenant-slug') || '').toLowerCase().trim();
  let tenantSlug = incomingSlug || 'baytak';
  let isSuperAdminHost = false;

  if (incomingSlug) {
    tenantSlug = incomingSlug;
    if (incomingSlug === 'super-admin') isSuperAdminHost = true;
  } else if (hostClean === 'at.mtapp.ly' || hostClean === 'admin.mtapp.ly') {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
