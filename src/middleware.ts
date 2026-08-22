import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const hostClean = hostname.split(':')[0].toLowerCase().trim();

  // Exclude static assets, api routes, and next internal files from rewrite/redirect
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Domain & Subdomain Mapping:
  // 1. https://at.mtapp.ly & https://at.mtapp.ly/dashboard/super-admin -> الرئيسية: لوحة التحكم المركزية للسوبر أدمن
  // 2. https://at.baitak.mtapp.ly/ & https://baitak.mtapp.ly/ -> فرعية: نشاط صيدلية بيتك
  // 3. https://at.mt.mtapp.ly/ & https://at.madar.mtapp.ly/ -> فرعية: نشاط شركة مدار التقنية
  // 4. https://alnaqaa.mtapp.ly/ & https://at.alnaqaa.mtapp.ly/ -> فرعية: نشاط النقاء
  // 5. https://[slug].mtapp.ly/ -> فرعية: أنشطة المشتركين المستقلة
  const incomingSlug = (request.headers.get('x-tenant-slug') || '').toLowerCase().trim();
  let tenantSlug = incomingSlug || 'baytak';
  let isSuperAdminHost = false;

  if (incomingSlug) {
    tenantSlug = incomingSlug;
    if (incomingSlug === 'super-admin') isSuperAdminHost = true;
  } else if (
    hostClean === 'at.mtapp.ly' ||
    hostClean === 'admin.mtapp.ly' ||
    hostClean === 'mtapp.ly'
  ) {
    isSuperAdminHost = true;
    tenantSlug = 'super-admin';
  } else if (
    hostClean === 'at.baitak.mtapp.ly' ||
    hostClean === 'baitak.mtapp.ly' ||
    hostClean === 'localhost' ||
    hostClean === '127.0.0.1'
  ) {
    tenantSlug = 'baytak';
  } else if (
    hostClean === 'at.mt.mtapp.ly' ||
    hostClean === 'mt.mtapp.ly' ||
    hostClean === 'at.madar.mtapp.ly' ||
    hostClean === 'madar.mtapp.ly'
  ) {
    tenantSlug = 'madar';
  } else if (
    hostClean === 'alnaqaa.mtapp.ly' ||
    hostClean === 'at.alnaqaa.mtapp.ly' ||
    hostClean === 'naqaa.mtapp.ly'
  ) {
    tenantSlug = 'alnaqaa';
  } else if (hostClean.endsWith('.mtapp.ly')) {
    const sub = hostClean.replace('.mtapp.ly', '').trim();
    tenantSlug = sub.startsWith('at.') ? sub.replace(/^at\./, '') : sub;
  }

  // Clone headers and inject tenant slug for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  // 1. If user visits root / on the main Super Admin host (at.mtapp.ly), redirect directly to Super Admin dashboard
  if (isSuperAdminHost && (url.pathname === '/' || url.pathname === '/login')) {
    return NextResponse.redirect(new URL('/dashboard/super-admin', request.url));
  }

  // 2. If user accesses tenant-specific apps directly on the Master Super-Admin host (at.mtapp.ly), redirect them to the primary tenant domain (at.baitak.mtapp.ly)
  if (isSuperAdminHost) {
    if (url.pathname.startsWith('/pharmacy')) {
      return NextResponse.redirect(new URL(`https://at.baitak.mtapp.ly${url.pathname}${url.search}`));
    }
    if (url.pathname.startsWith('/dashboard/admin')) {
      return NextResponse.redirect(new URL(`https://at.baitak.mtapp.ly/dashboard/admin${url.search}`));
    }
    if (url.pathname.startsWith('/dashboard/employee')) {
      return NextResponse.redirect(new URL(`https://at.baitak.mtapp.ly/dashboard/employee${url.search}`));
    }
  }

  // 3. If user on a sub-tenant domain visits /dashboard/super-admin, redirect them to the main central domain
  if (!isSuperAdminHost && hostClean.endsWith('.mtapp.ly') && url.pathname.startsWith('/dashboard/super-admin')) {
    return NextResponse.redirect(new URL('https://at.mtapp.ly/dashboard/super-admin'));
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
