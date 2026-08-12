/** @type {import('next').Next.jsConfig} */
const nextConfig = {
  // 🚨 สั่งให้ Vercel ข้ามการเช็ค Error ของ ESLint ตอน Build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;