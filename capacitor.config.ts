import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.futureworld.app',
  appName: 'Future World',
  webDir: 'dist/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;