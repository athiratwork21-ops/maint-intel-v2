import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// 🌟 สร้างตัวแปรสุ่มตัวเลขเวลาปัจจุบัน เพื่อหลอก Cache ของ LINE/Facebook
const cacheBuster = Date.now();

// 👇 อัปเกรด Viewport เป็นท่ายากปราบไอโฟน
export const viewport = {
  themeColor: '#0f172a', 
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // กันลูกน้องซูมหน้าจอจนพัง
  viewportFit: 'cover', // 👈 นี่คือคาถาที่ทำให้ทะลุรอยบากไอโฟน!
};

export const metadata: Metadata = {
  title: 'Request Parts',
  description: 'ระบบจัดการอะไหล่',
  manifest: '/manifest.json', // 👈 (เพิ่มใหม่สำหรับ PWA) เรียกบัตรประชาชนแอป
  appleWebApp: {
    capable: true,
    title: 'Maint. Intel',
    statusBarStyle: 'black-translucent', // สั่งให้แอปทะลุไปถึงขอบจอบนสุด
  },
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
      {/* 👇 ยัดคาถาปราบไอโฟนลงไปตรงๆ แบบไม่ต้องง้อ Next.js */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      {/* 👇 เอาสีกรมท่าทาพื้นหลังสุดของเว็บ กันไอโฟนแอบใส่สีขาว */}
      <body className={`${inter.className} bg-[#0f172a]`}>
        {children}
      </body>
    </html>
  );
}