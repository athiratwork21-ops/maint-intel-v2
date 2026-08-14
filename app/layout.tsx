import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Maint. Intel',
  description: 'ระบบจัดการอะไหล่',
  openGraph: {
    images: [
      {
        url: '/og-cover.png', 
        width: 1200,
        height: 630,
        alt: 'Maintenance Intelligence Cover',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        // 👇 แก้ตรงนี้ให้เหมือนกันด้วยครับบอส
        url: '/og-cover.png', 
        width: 1200,
        height: 630,
        alt: 'Maintenance Intelligence Cover',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}