import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// 🌟 สร้างตัวแปรสุ่มตัวเลขเวลาปัจจุบัน เพื่อหลอก Cache ของ LINE/Facebook
const cacheBuster = Date.now();

export const metadata: Metadata = {
  title: 'Maint. Intel',
  description: 'ระบบจัดการอะไหล่',
  openGraph: {
    images: [
      {
        // 👇 อัปเกรดเป็นลิงก์เต็ม + แนบเลข Cache Buster อัตโนมัติ
        url: `https://maintintelv2.vercel.app/og-cover.png?v=${cacheBuster}`, 
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
        // 👇 ทำแบบเดียวกันในส่วนของ Twitter
        url: `https://maintintelv2.vercel.app/og-cover.png?v=${cacheBuster}`, 
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