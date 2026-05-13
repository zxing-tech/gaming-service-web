import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  webViewProps: { type: 'game' },
  appName: 'grab-football',
  brand: {
    displayName: 'Grab Football',
    primaryColor: '#35CD21',
    icon: '',
    bridgeColorMode: 'basic',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'next dev',
      build: 'next build',
    },
  },
  permissions: [],
  outdir: 'out',
});
