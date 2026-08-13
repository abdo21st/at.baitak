import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'حضورك | HodoorK - نظام إدارة وتدوين ساعات العمل الذكي',
  description: 'نظام إدارة وتدوين ساعات العمل والمشاريع المخصص بالنطاق at.baitak.mtapp.ly بدعم الساعات المرنة والمشاريع وتنبيهات الموقع الجغرافي بالخلفية.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'حضورك',
  },
};

export const viewport: Viewport = {
  themeColor: '#0284c7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0284c7" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-slate-50 text-slate-900 font-cairo antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
