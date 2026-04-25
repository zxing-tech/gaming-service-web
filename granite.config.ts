import { defineConfig, type AppsInTossWebConfig } from '@apps-in-toss/web-framework/config';

/** Granite supports this; not yet on `AppsInTossWebConfig` in all SDK versions */
type GraniteGameCenter = { gameCenter?: { enabled: boolean } };

const config: AppsInTossWebConfig & GraniteGameCenter = {
  webViewProps: { type: 'game' },
  appName: 'garb-football',
  brand: {
    displayName: 'Garb Football',
    primaryColor: '#35CD21',
    icon: 'https://raw.githubusercontent.com/zxing-tech/gaming-service-web/main/public/icon.svg',
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
  gameCenter: {
    enabled: true,
  },
};

export default defineConfig(config);
