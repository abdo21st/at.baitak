import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'حضورك | HodoorK - نظام إدارة وتدوين ساعات العمل الذكي',
  description: 'نظام إدارة وتدوين ساعات العمل والمشاريع المخصص للنطاق at.baitak.mtapp.ly بدعم الساعات المرنة والمشاريع وتنبيهات الواتساب والمظهر الفاتح الناصع.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 text-slate-900 font-cairo antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
