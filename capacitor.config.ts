import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maint.intel',
  appName: 'Maint-Intel',
  webDir: 'public', //  ชี้ไปที่โฟลเดอร์ public เปล่าๆ ได้เลย
  server: {
    url: 'https://maintintelv2.vercel.app' //  ชี้เป้าไปที่เว็บจริงของบอส!
  }
};

export default config;