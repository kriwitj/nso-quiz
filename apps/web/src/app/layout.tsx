import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'NSO Quiz — ระบบแบบทดสอบออนไลน์',
  description:
    'ระบบสร้างและจัดการแบบทดสอบออนไลน์ของสำนักงานสถิติแห่งชาติ เรียนรู้ข้อมูลสถิติผ่านกิจกรรมที่น่าสนใจ',
  keywords: ['NSO', 'quiz', 'สถิติ', 'แบบทดสอบ', 'สำนักงานสถิติแห่งชาติ'],
  authors: [{ name: 'NSO Thailand' }],
  openGraph: {
    title: 'NSO Quiz',
    description: 'ระบบแบบทดสอบออนไลน์ สำนักงานสถิติแห่งชาติ',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
