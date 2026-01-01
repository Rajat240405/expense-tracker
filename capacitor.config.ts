import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myexpensetracker.app',
  appName: 'My Expenses',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
