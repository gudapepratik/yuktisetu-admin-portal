import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Institute CRUD moved to institute-service (:8086) when admin-service was
      // split by bounded context. The portal's paths are unchanged on purpose --
      // there are ~49 hardcoded /api/admin literals across src/api, and the
      // migration's rule is that no frontend code changes. Vite matches the most
      // specific prefix first, so these three win over the '/api/admin' entry
      // below and everything else still reaches admin-service.
      '/api/admin/trusts': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },
      '/api/admin/colleges': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },
      '/api/admin/departments': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/user': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
});
