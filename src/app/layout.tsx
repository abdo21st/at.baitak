import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

export const metadata: Metadata = {
  title: 'حضورك | HodoorK',
  description: 'نظام إدارة وتدوين ساعات العمل والمشاريع بدعم الساعات المرنة وتنبيهات الموقع الجغرافي.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'حضورك | HodoorK',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="bg-slate-50 text-slate-900 font-dubai antialiased min-h-screen">
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
