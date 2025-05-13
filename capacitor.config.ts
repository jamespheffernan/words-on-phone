import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wordsapp.wordsOnPhone',
  appName: 'Words on Phone',
  webDir: 'dist',
  ios: {
    scheme: 'WordsOnPhone',
    backgroundColor: '#ffffff',
    contentInset: 'automatic',
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    Haptics: {
      enable: true
    }
  },
  server: {
    hostname: 'app',
    androidScheme: 'https'
  }
};

export default config;
