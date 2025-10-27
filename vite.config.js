import { defineConfig, loadEnv } from 'vite';

export default ({ mode }) => {
  // Aktif env dosyasını (development veya production) yükle
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    base: env.VITE_PUBLIC_URL || './',
    server: {
      host: env.HOST || 'localhost',
      port: env.PORT ? parseInt(env.PORT) : 5173,
      open: true,
    },
  });
};
